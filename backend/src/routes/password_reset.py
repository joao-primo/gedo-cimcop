from flask import Blueprint, request, jsonify
from models.user import User, db
from models.password_reset import PasswordResetToken
from services.email_service import enviar_email_reset_senha
import re
import logging
from datetime import datetime, timedelta
from flask_limiter.util import get_remote_address
from main import limiter

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

password_reset_bp = Blueprint('password_reset', __name__)

# Rate limiting simples (em produção, use Redis)
reset_attempts = {}


def validar_email(email):
    """Valida formato do email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validar_senha(senha):
    """Valida critérios de segurança da senha"""
    if len(senha) < 8:
        return False, "A senha deve ter pelo menos 8 caracteres"

    if not re.search(r'[A-Z]', senha):
        return False, "A senha deve conter pelo menos uma letra maiúscula"

    if not re.search(r'[a-z]', senha):
        return False, "A senha deve conter pelo menos uma letra minúscula"

    if not re.search(r'[0-9]', senha):
        return False, "A senha deve conter pelo menos um número"

    # Opcional: caracteres especiais
    # if not re.search(r'[!@#$%^&*(),.?":{}|<>]', senha):
    #     return False, "A senha deve conter pelo menos um caractere especial"

    return True, "Senha válida"


def verificar_rate_limit(ip_address, max_attempts=5, window_minutes=15):
    """Verifica rate limiting para tentativas de reset"""
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=window_minutes)

    if ip_address not in reset_attempts:
        reset_attempts[ip_address] = []

    # Limpar tentativas antigas
    reset_attempts[ip_address] = [
        attempt for attempt in reset_attempts[ip_address]
        if attempt > window_start
    ]

    # Verificar se excedeu o limite
    if len(reset_attempts[ip_address]) >= max_attempts:
        return False, f"Muitas tentativas. Tente novamente em {window_minutes} minutos."

    # Registrar nova tentativa
    reset_attempts[ip_address].append(now)
    return True, "OK"


@password_reset_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per minute;10 per hour")
def forgot_password():
    """Solicita reset de senha com rate limiting e auditoria"""
    try:
        # Obter IP do cliente
        ip_address = request.environ.get(
            'HTTP_X_FORWARDED_FOR', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')

        # Verificar rate limiting
        rate_ok, rate_message = verificar_rate_limit(ip_address)
        if not rate_ok:
            logger.warning(f"Rate limit excedido para IP {ip_address}")
            return jsonify({'success': False, 'error': rate_message}), 429

        data = request.get_json()
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'success': False, 'error': 'Email é obrigatório'}), 400

        if not validar_email(email):
            return jsonify({'success': False, 'error': 'Formato de email inválido'}), 400

        # Buscar usuário
        user = User.query.filter_by(email=email).first()

        # Por segurança, sempre retornar sucesso (não revelar se email existe)
        if not user:
            logger.info(
                f"Tentativa de reset para email inexistente: {email} (IP: {ip_address})")
            return jsonify({
                'success': True,
                'message': 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
            }), 200

        # Invalidar tokens anteriores do usuário
        PasswordResetToken.query.filter_by(
            user_id=user.id,
            used=False
        ).update({'used': True})

        # Criar novo token
        reset_token = PasswordResetToken(user.id, ip_address, user_agent)
        db.session.add(reset_token)
        db.session.commit()

        # Enviar email
        raw_token = reset_token.get_raw_token()
        sucesso_email = enviar_email_reset_senha(user, raw_token)

        if not sucesso_email:
            logger.error(f"Falha ao enviar email de reset para {user.email}")
            return jsonify({
                'success': False,
                'error': 'Erro ao enviar email. Tente novamente mais tarde.'
            }), 500

        logger.info(
            f"Token de reset criado para usuário {user.email} (IP: {ip_address})")

        return jsonify({
            'success': True,
            'message': 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
        }), 200

    except Exception as e:
        logger.error(f"Erro em forgot_password: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Erro interno do servidor'}), 500


@password_reset_bp.route('/validate-reset-token/<token>', methods=['GET'])
def validate_reset_token(token):
    """Verifica se o token de reset é válido"""
    try:
        if not token:
            return jsonify({'valid': False, 'error': 'Token é obrigatório'}), 400

        # Verificar token
        reset_token = PasswordResetToken.verify_token(token)

        if not reset_token:
            logger.warning(
                f"Tentativa de validação com token inválido: {token[:10]}...")
            return jsonify({'valid': False, 'error': 'Token inválido ou expirado'}), 400

        return jsonify({
            'valid': True,
            'email': reset_token.user.email,
            'expires_at': reset_token.expires_at.isoformat(),
            'username': reset_token.user.username
        }), 200

    except Exception as e:
        logger.error(f"Erro em validate_reset_token: {str(e)}")
        return jsonify({'valid': False, 'error': 'Erro interno do servidor'}), 500


@password_reset_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Redefine a senha usando o token"""
    try:
        data = request.get_json()
        token = data.get('token', '').strip()
        new_password = data.get('password', '').strip()

        # Validações
        if not token:
            return jsonify({'success': False, 'error': 'Token é obrigatório'}), 400

        if not new_password:
            return jsonify({'success': False, 'error': 'Nova senha é obrigatória'}), 400

        # Validar critérios da senha
        senha_valida, mensagem_senha = validar_senha(new_password)
        if not senha_valida:
            return jsonify({'success': False, 'error': mensagem_senha}), 400

        # Verificar token
        reset_token = PasswordResetToken.verify_token(token)

        if not reset_token:
            logger.warning(
                f"Tentativa de reset com token inválido: {token[:10]}...")
            return jsonify({'success': False, 'error': 'Token inválido ou expirado'}), 400

        # Atualizar senha do usuário
        user = reset_token.user
        user.set_password(new_password)

        # Marcar token como usado
        reset_token.mark_as_used()

        db.session.commit()

        logger.info(f"Senha redefinida com sucesso para usuário {user.email}")

        return jsonify({
            'success': True,
            'message': 'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.'
        }), 200

    except Exception as e:
        logger.error(f"Erro em reset_password: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Erro interno do servidor'}), 500


@password_reset_bp.route('/change-password', methods=['POST'])
def change_password():
    """Altera senha do usuário logado"""
    from routes.auth import token_required

    @token_required
    def _change_password(current_user):
        try:
            data = request.get_json()
            current_password = data.get('current_password', '').strip()
            new_password = data.get('new_password', '').strip()
            confirm_password = data.get('confirm_password', '').strip()

            # Validações
            if not current_password:
                return jsonify({'success': False, 'error': 'Senha atual é obrigatória'}), 400

            if not new_password:
                return jsonify({'success': False, 'error': 'Nova senha é obrigatória'}), 400

            if new_password != confirm_password:
                return jsonify({'success': False, 'error': 'As senhas não coincidem'}), 400

            # Verificar senha atual
            if not current_user.check_password(current_password):
                return jsonify({'success': False, 'error': 'Senha atual incorreta'}), 400

            # Validar critérios da nova senha
            senha_valida, mensagem_senha = validar_senha(new_password)
            if not senha_valida:
                return jsonify({'success': False, 'error': mensagem_senha}), 400

            # Atualizar senha
            current_user.set_password(new_password)
            db.session.commit()

            logger.info(f"Senha alterada pelo usuário {current_user.email}")

            return jsonify({
                'success': True,
                'message': 'Senha alterada com sucesso!'
            }), 200

        except Exception as e:
            logger.error(f"Erro em change_password: {str(e)}")
            db.session.rollback()
            return jsonify({'success': False, 'error': 'Erro interno do servidor'}), 500

    return _change_password()


@password_reset_bp.route('/cleanup-tokens', methods=['POST'])
def cleanup_expired_tokens():
    """Endpoint para limpeza de tokens expirados (usar em cron job)"""
    try:
        # Verificar se é uma chamada interna (adicionar autenticação se necessário)
        removed_count = PasswordResetToken.cleanup_expired_tokens()

        logger.info(
            f"Limpeza de tokens: {removed_count} tokens expirados removidos")

        return jsonify({
            'success': True,
            'message': f'{removed_count} tokens expirados removidos'
        }), 200

    except Exception as e:
        logger.error(f"Erro em cleanup_tokens: {str(e)}")
        return jsonify({'success': False, 'error': 'Erro interno do servidor'}), 500
