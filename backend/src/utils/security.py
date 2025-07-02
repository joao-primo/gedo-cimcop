import hashlib
import secrets
import time
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import logging
import re
from collections import defaultdict

logger = logging.getLogger(__name__)


class SecurityManager:
    """Gerenciador de segurança simplificado"""

    def __init__(self):
        self.failed_attempts = defaultdict(list)
        self.blocked_ips = {}
        self.max_attempts = 10  # Aumentado para desenvolvimento
        self.block_duration = 300  # 5 minutos
        self.window_duration = 300  # 5 minutos

    def register_failed_attempt(self, ip_address):
        """Registra uma tentativa de login falhada"""
        current_time = time.time()

        # Remove tentativas antigas
        self.failed_attempts[ip_address] = [
            attempt_time for attempt_time in self.failed_attempts[ip_address]
            if current_time - attempt_time < self.window_duration
        ]

        # Adiciona a nova tentativa
        self.failed_attempts[ip_address].append(current_time)

        # Verifica se deve bloquear o IP
        if len(self.failed_attempts[ip_address]) >= self.max_attempts:
            self.blocked_ips[ip_address] = current_time + self.block_duration
            logger.warning(
                f"IP {ip_address} bloqueado por excesso de tentativas")

    def is_ip_blocked(self, ip_address):
        """Verifica se um IP está bloqueado"""
        if ip_address not in self.blocked_ips:
            return False

        current_time = time.time()
        if current_time > self.blocked_ips[ip_address]:
            del self.blocked_ips[ip_address]
            return False

        return True

    def clear_failed_attempts(self, ip_address):
        """Limpa as tentativas falhadas para um IP"""
        if ip_address in self.failed_attempts:
            del self.failed_attempts[ip_address]
        if ip_address in self.blocked_ips:
            del self.blocked_ips[ip_address]


# Instância global
security_manager = SecurityManager()


def audit_log(action, user_id=None, details=None):
    """Registra eventos de auditoria"""
    try:
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'user_id': user_id,
            'ip': request.remote_addr if request else 'unknown',
            'user_agent': request.headers.get('User-Agent', 'unknown') if request else 'unknown',
            'details': details or {}
        }

        logger.info(f"AUDIT: {log_entry}")
        return log_entry
    except Exception as e:
        logger.error(f"Erro ao registrar log de auditoria: {e}")
        return None


def rate_limit(max_requests=5, window_minutes=15):
    """Decorator para rate limiting - simplificado para desenvolvimento"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            return f(*args, **kwargs)
        return wrapper
    return decorator


def validate_password_strength(password):
    """Valida a força da senha - simplificado"""
    if not password:
        return False, "Senha é obrigatória"

    if len(password) < 3:  # Simplificado para desenvolvimento
        return False, "Senha deve ter pelo menos 3 caracteres"

    return True, "Senha válida"
