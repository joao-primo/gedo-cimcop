import hashlib
import secrets
import time
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import logging
import re
from collections import defaultdict
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask import current_app
import json

logger = logging.getLogger(__name__)


class SecurityManager:
    """Gerenciador de segurança robusto"""

    def __init__(self):
        self.failed_attempts = defaultdict(list)
        self.blocked_ips = {}
        self.progressive_blocks = defaultdict(
            int)  # Contador de bloqueios por IP

        # Configurações mais rigorosas
        self.max_attempts = 3  # Máximo 3 tentativas
        self.base_block_duration = 900  # 15 minutos inicial
        self.window_duration = 300  # 5 minutos para contar tentativas
        self.max_progressive_blocks = 5  # Máximo de bloqueios progressivos

        # Bloqueios progressivos: 15min, 1h, 6h, 24h, 7 dias
        self.progressive_durations = [900, 3600, 21600, 86400, 604800]

    def get_client_identifier(self):
        """Obtém identificador único do cliente"""
        # Usar IP + User-Agent hash para identificação mais robusta
        ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')

        # Criar identificador único
        identifier = f"{ip}:{hashlib.sha256(user_agent.encode()).hexdigest()[:16]}"
        return identifier

    def register_failed_attempt(self, identifier=None):
        """Registra uma tentativa falhada com bloqueio progressivo"""
        if not identifier:
            identifier = self.get_client_identifier()

        current_time = time.time()

        # Remove tentativas antigas
        self.failed_attempts[identifier] = [
            attempt_time for attempt_time in self.failed_attempts[identifier]
            if current_time - attempt_time < self.window_duration
        ]

        # Adiciona a nova tentativa
        self.failed_attempts[identifier].append(current_time)

        # Verifica se deve bloquear
        if len(self.failed_attempts[identifier]) >= self.max_attempts:
            self._apply_progressive_block(identifier, current_time)

    def _apply_progressive_block(self, identifier, current_time):
        """Aplica bloqueio progressivo"""
        block_count = self.progressive_blocks[identifier]

        if block_count < len(self.progressive_durations):
            block_duration = self.progressive_durations[block_count]
        else:
            # Bloqueio permanente após muitas tentativas
            block_duration = 604800 * 4  # 4 semanas

        self.blocked_ips[identifier] = current_time + block_duration
        self.progressive_blocks[identifier] += 1

        # Log de segurança
        logger.warning(f"IP/Cliente bloqueado progressivamente: {identifier[:20]}... "
                       f"Bloqueio #{block_count + 1}, Duração: {block_duration/60:.0f} minutos")

        # Limpar tentativas após bloqueio
        self.failed_attempts[identifier] = []

    def is_blocked(self, identifier=None):
        """Verifica se um cliente está bloqueado"""
        if not identifier:
            identifier = self.get_client_identifier()

        if identifier not in self.blocked_ips:
            return False, None

        current_time = time.time()
        block_end_time = self.blocked_ips[identifier]

        if current_time > block_end_time:
            # Bloqueio expirou
            del self.blocked_ips[identifier]
            return False, None

        # Calcular tempo restante
        remaining_time = int(block_end_time - current_time)
        return True, remaining_time

    def clear_failed_attempts(self, identifier=None):
        """Limpa as tentativas falhadas para um cliente (após login bem-sucedido)"""
        if not identifier:
            identifier = self.get_client_identifier()

        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]

        # NÃO limpar bloqueios ativos ou contador progressivo
        logger.info(f"Tentativas falhadas limpas para: {identifier[:20]}...")

    def get_security_status(self, identifier=None):
        """Retorna status de segurança do cliente"""
        if not identifier:
            identifier = self.get_client_identifier()

        is_blocked, remaining_time = self.is_blocked(identifier)
        failed_count = len(self.failed_attempts.get(identifier, []))
        progressive_count = self.progressive_blocks.get(identifier, 0)

        return {
            'is_blocked': is_blocked,
            'remaining_block_time': remaining_time,
            'failed_attempts': failed_count,
            'progressive_blocks': progressive_count,
            'max_attempts': self.max_attempts
        }


# Instância global
security_manager = SecurityManager()


def security_check_decorator(f):
    """Decorator para verificação de segurança"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Verificar se está bloqueado
        is_blocked, remaining_time = security_manager.is_blocked()

        if is_blocked:
            minutes = remaining_time // 60
            seconds = remaining_time % 60

            logger.warning(
                f"Tentativa de acesso bloqueada: {security_manager.get_client_identifier()[:20]}...")

            return jsonify({
                'message': f'Acesso temporariamente bloqueado. Tente novamente em {minutes}m {seconds}s.',
                'blocked_until': remaining_time,
                'error_code': 'RATE_LIMITED'
            }), 429

        return f(*args, **kwargs)

    return decorated_function


def audit_log(action, user_id=None, details=None):
    """Registra eventos de auditoria com informações de segurança"""
    try:
        # Obter informações de segurança
        security_status = security_manager.get_security_status()

        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'user_id': user_id,
            'client_id': security_manager.get_client_identifier()[:20] + '...',
            'ip': request.remote_addr if request else 'unknown',
            'user_agent_hash': hashlib.sha256(request.headers.get('User-Agent', '').encode()).hexdigest()[:16] if request else 'unknown',
            'security_status': security_status,
            'details': sanitize_log_data(details or {}),
            'request_id': secrets.token_hex(8)
        }

        # Log estruturado
        logger.info(f"AUDIT: {json.dumps(log_entry, default=str)}")
        return log_entry
    except Exception as e:
        logger.error(f"Erro ao registrar log de auditoria: {e}")
        return None


def sanitize_log_data(data):
    """Sanitiza dados sensíveis para logs"""
    if isinstance(data, dict):
        sanitized = {}
        sensitive_keys = ['password', 'senha', 'token',
                          'secret', 'key', 'auth', 'authorization']

        for key, value in data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                sanitized[key] = '[REDACTED]'
            elif key_lower == 'email' and isinstance(value, str) and '@' in value:
                # Mascarar email
                parts = value.split('@')
                sanitized[key] = f"{parts[0][:2]}***@{parts[1]}"
            else:
                sanitized[key] = sanitize_log_data(value)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_log_data(item) for item in data]
    elif isinstance(data, str) and len(data) > 100:
        # Truncar strings muito longas
        return data[:97] + '...'
    else:
        return data


def rate_limit(max_requests=3, window_minutes=5):
    """Decorator para rate limiting específico por endpoint"""
    def decorator(f):
        endpoint_attempts = defaultdict(list)

        @wraps(f)
        def wrapper(*args, **kwargs):
            identifier = security_manager.get_client_identifier()
            current_time = time.time()
            window_seconds = window_minutes * 60

            # Limpar tentativas antigas
            endpoint_attempts[identifier] = [
                attempt_time for attempt_time in endpoint_attempts[identifier]
                if current_time - attempt_time < window_seconds
            ]

            # Verificar limite
            if len(endpoint_attempts[identifier]) >= max_requests:
                logger.warning(
                    f"Rate limit excedido para endpoint {f.__name__}: {identifier[:20]}...")
                return jsonify({
                    'message': f'Muitas requisições. Tente novamente em {window_minutes} minutos.',
                    'error_code': 'ENDPOINT_RATE_LIMITED'
                }), 429

            # Registrar tentativa
            endpoint_attempts[identifier].append(current_time)

            return f(*args, **kwargs)
        return wrapper
    return decorator


def validate_password_strength(password):
    """Valida a força da senha com critérios rigorosos"""
    if not password:
        return False, "Senha é obrigatória"

    errors = []

    if len(password) < 8:
        errors.append("pelo menos 8 caracteres")

    if not re.search(r'[A-Z]', password):
        errors.append("pelo menos uma letra maiúscula")

    if not re.search(r'[a-z]', password):
        errors.append("pelo menos uma letra minúscula")

    if not re.search(r'\d', password):
        errors.append("pelo menos um número")

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("pelo menos um caractere especial")

    # Verificar padrões comuns fracos
    weak_patterns = [
        r'123456', r'password', r'qwerty', r'abc123',
        r'admin', r'user', r'login', r'senha'
    ]

    password_lower = password.lower()
    for pattern in weak_patterns:
        if pattern in password_lower:
            errors.append("não pode conter padrões comuns fracos")
            break

    if errors:
        return False, f"Senha deve ter: {', '.join(errors)}"

    return True, "Senha válida"


def generate_csrf_token():
    """Gera token CSRF seguro"""
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return s.dumps('csrf', salt='csrf-token')


def validate_csrf_token(token, max_age=3600):
    """Valida token CSRF"""
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        data = s.loads(token, salt='csrf-token', max_age=max_age)
        return data == 'csrf'
    except (BadSignature, SignatureExpired):
        return False
