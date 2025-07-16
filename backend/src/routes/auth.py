from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
from models.user import User, db
from models.obra import Obra
from utils.validators import ValidationError, validar_email, validar_senha, validar_username, validar_role, validar_json_data
from utils.security import audit_log, security_manager, generate_csrf_token, security_check_decorator
from functools import wraps
import jwt
import os
import logging
from datetime import datetime, timedelta
from flask_limiter.util import get_remote_address
from extensions import limiter
from flask_wtf.csrf import generate_csrf
import hashlib
import uuid

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)
csrf_bp = Blueprint('csrf', __name__)


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Token inválido'}), 401

        if not token:
            return jsonify({'message': 'Token é obrigatório'}), 401

        try:
            data = jwt.decode(token, os.getenv(
                'SECRET_KEY', 'default-secret-key'), algorithms=['HS256'])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'message': 'Usuário não encontrado'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token inválido'}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'administrador':
            return jsonify({'message': 'Acesso negado. Apenas administradores.'}), 403
        return f(current_user, *args, **kwargs)

    return decorated


def obra_access_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        # Se for administrador, tem acesso a tudo
        if current_user.role == 'administrador':
            return f(current_user, *args, **kwargs)

        # Se for usuário padrão, verificar se tem obra_id
        if current_user.role == 'usuario_padrao' and not current_user.obra_id:
            return jsonify({'message': 'Usuário não está associado a nenhuma obra'}), 403

        return f(current_user, *args, **kwargs)

    return decorated


def handle_validation_error(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValidationError as e:
            return jsonify({'message': str(e)}), 400
        except Exception as e:
            logger.error(f"Erro em {f.__name__}: {str(e)}")
            return jsonify({
                'message': 'Erro interno do servidor'
            }), 500
    return decorated_function


def sanitize_log_data(data):
    """Sanitiza dados sensíveis para logs"""
    if isinstance(data, dict):
        sanitized = {}
        sensitive_keys = ['password', 'senha',
                          'token', 'secret', 'key', 'auth']

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
    elif isinstance(data, str) and len(data) > 50:
        # Truncar strings muito longas
        return data[:47] + '...'
    else:
        return data

# Atualizar a função audit_log para usar sanitização


def audit_log(action, user_id=None, details=None):
    """Registra eventos de auditoria com sanitização"""
    try:
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'user_id': user_id,
            'ip': request.remote_addr if request else 'unknown',
            'user_agent_hash': hashlib.sha256(request.headers.get('User-Agent', '').encode()).hexdigest()[:16] if request else 'unknown',
            'details': sanitize_log_data(details or {}),
            'request_id': uuid.uuid4().hex[:8]
        }

        logger.info(f"AUDIT: {log_entry}")
        return log_entry
    except Exception as e:
        logger.error(f"Erro ao registrar log de auditoria: {e}")
        return None


@auth_bp.route('/login', methods=['POST'])
@security_check_decorator  # Adicionar esta linha
@limiter.limit("3 per minute;10 per hour")
@handle_validation_error
def login():
    try:
        data = request.get_json()
        validar_json_data(data, ['email', 'password'])

        # Validar e sanitizar dados
        email = validar_email(data['email'])
        password = data['password']

        # LOG SEGURO - sem informações sensíveis
        logger.info(
            f"Tentativa de login para usuário: {email[:3]}***@{email.split('@')[1] if '@' in email else 'unknown'}")

        # ATUALIZADO: Buscar usuário usando método compatível com criptografia
        user = User.find_by_email(email)

        if not user:
            # LOG SEGURO - sem revelar se usuário existe
            logger.warning(
                f"Tentativa de login com credenciais inválidas - IP: {request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)}")
            return jsonify({'message': 'Credenciais inválidas'}), 401

        # LOG SEGURO - sem resultado da verificação
        logger.info(f"Usuário encontrado, verificando credenciais...")

        # Verificar senha
        password_check = user.check_password(password)

        if not password_check:
            # Registrar tentativa falhada ANTES de retornar erro
            security_manager.register_failed_attempt()

            # LOG SEGURO - sem detalhes da senha
            logger.warning(
                f"Falha na autenticação para usuário {email[:3]}***@{email.split('@')[1]} - IP: {request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)}")
            ip_address = request.environ.get(
                'HTTP_X_FORWARDED_FOR', request.remote_addr)
            audit_log('LOGIN_FAILED', user.id, {
                'email_hash': hashlib.sha256(email.encode()).hexdigest()[:16],
                'ip': ip_address,
                'reason': 'authentication_failed'
            })
            return jsonify({'message': 'Credenciais inválidas'}), 401

        # Verificar se usuário está ativo
        if not user.ativo:
            logger.warning(
                f"Tentativa de login com conta desativada - User ID: {user.id}")
            return jsonify({'message': 'Conta desativada. Entre em contato com o administrador.'}), 401

        # Log do login bem-sucedido
        ip_address = request.environ.get(
            'HTTP_X_FORWARDED_FOR', request.remote_addr)
        logger.info(
            f"Login bem-sucedido - User ID: {user.id}, Role: {user.role}, IP: {ip_address}")

        # Limpar tentativas falhadas após login bem-sucedido
        security_manager.clear_failed_attempts()

        audit_log('LOGIN_SUCCESS', user.id, {
            'ip': ip_address,
            'user_agent_hash': hashlib.sha256(request.headers.get('User-Agent', '').encode()).hexdigest()[:16]
        })

        # Atualizar último login
        user.ultimo_login = datetime.utcnow()
        db.session.commit()

        token = user.generate_token()

        response_data = {
            'message': 'Login realizado com sucesso',
            'token': token,
            'user': user.to_dict()
        }

        # Adicionar aviso se senha deve ser alterada
        if user.must_change_password:
            if user.password_changed_by_admin:
                response_data['warning'] = 'Sua senha foi alterada pelo administrador. Você deve criar uma nova senha.'
            else:
                response_data['warning'] = 'Você deve alterar sua senha para continuar.'

        return jsonify(response_data), 200

    except ValidationError as e:
        logger.error(f"Erro de validação no login: {str(e)}")
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        # LOG SEGURO - sem stack trace completo em produção
        logger.error(f"Erro no login - Request ID: {uuid.uuid4().hex[:8]}")
        return jsonify({'message': 'Erro interno do servidor'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@token_required
@handle_validation_error
def change_password(current_user):
    """Usuário altera própria senha"""
    try:
        data = request.get_json()
        validar_json_data(data, ['current_password', 'new_password'])

        current_password = data['current_password']
        new_password = validar_senha(data['new_password'])

        # Verificar senha atual
        if not current_user.check_password(current_password):
            audit_log('PASSWORD_CHANGE_FAILED', current_user.id,
                      {'reason': 'wrong_current_password'})
            return jsonify({'message': 'Senha atual incorreta'}), 400

        # Verificar se admin pode alterar própria senha
        if current_user.role == 'administrador':
            can_change, message = current_user.can_change_own_password()
            if not can_change:
                audit_log('PASSWORD_CHANGE_BLOCKED', current_user.id, {
                          'reason': 'time_restriction', 'message': message})
                return jsonify({'message': message}), 400

        # Alterar senha
        current_user.set_password(new_password, changed_by_admin=False)
        db.session.commit()

        audit_log('PASSWORD_CHANGED_BY_USER', current_user.id, {
            'user_role': current_user.role,
            'forced_change': current_user.password_changed_by_admin
        })

        logger.info(f"Senha alterada pelo usuário: {current_user.get_email()}")

        return jsonify({
            'message': 'Senha alterada com sucesso',
            'password_status': current_user.get_password_status()
        }), 200

    except ValidationError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro em change_password: {str(e)}")
        return jsonify({'message': 'Erro interno do servidor'}), 500


@auth_bp.route('/admin/change-user-password', methods=['POST'])
@token_required
@admin_required
@handle_validation_error
def admin_change_user_password(current_user):
    """Admin altera senha de qualquer usuário"""
    try:
        data = request.get_json()
        validar_json_data(data, ['user_id', 'new_password'])

        user_id = data['user_id']
        new_password = validar_senha(data['new_password'])

        # Buscar usuário
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'Usuário não encontrado'}), 404

        # Admin não pode alterar senha de outro admin
        if target_user.role == 'administrador' and target_user.id != current_user.id:
            audit_log('PASSWORD_CHANGE_BLOCKED', current_user.id, {
                'reason': 'admin_to_admin_blocked',
                'target_user': target_user.get_email()
            })
            return jsonify({'message': 'Administradores não podem alterar senhas de outros administradores'}), 403

        # Alterar senha (marcando como alterada pelo admin)
        target_user.set_password(new_password, changed_by_admin=True)
        db.session.commit()

        audit_log('PASSWORD_CHANGED_BY_ADMIN', current_user.id, {
            'target_user_id': target_user.id,
            'target_user_email': target_user.get_email(),
            'target_user_role': target_user.role
        })

        logger.info(
            f"Senha do usuário {target_user.get_email()} alterada pelo admin {current_user.get_email()}")

        return jsonify({
            'message': f'Senha do usuário {target_user.username} alterada com sucesso. O usuário deverá criar uma nova senha no próximo login.',
            'user': target_user.to_dict()
        }), 200

    except ValidationError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro em admin_change_user_password: {str(e)}")
        return jsonify({'message': 'Erro interno do servidor'}), 500


@auth_bp.route('/password-status', methods=['GET'])
@token_required
def get_password_status(current_user):
    """Retorna status da senha do usuário atual"""
    return jsonify({
        'password_status': current_user.get_password_status()
    }), 200


@auth_bp.route('/register', methods=['POST'])
@token_required
@admin_required
@handle_validation_error
def register(current_user):
    try:
        data = request.get_json()
        validar_json_data(data, ['username', 'email', 'password'])

        # Validar e sanitizar dados
        username = validar_username(data['username'])
        email = validar_email(data['email'])
        password = validar_senha(data['password'])
        role = validar_role(data.get('role', 'usuario_padrao'))

        # ATUALIZADO: Verificar se o usuário já existe usando método compatível com criptografia
        if User.find_by_email(email):
            return jsonify({'message': 'Email já está em uso'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username já está em uso'}), 400

        # Validar obra_id para usuário padrão
        obra_id = data.get('obra_id')
        if role == 'usuario_padrao':
            if not obra_id:
                return jsonify({'message': 'Obra é obrigatória para usuário padrão'}), 400

            obra = Obra.query.get(obra_id)
            if not obra:
                return jsonify({'message': 'Obra não encontrada'}), 404

        # Criar usuário
        user = User(
            username=username,
            email=email,
            password=password,
            role=role,
            obra_id=obra_id if role == 'usuario_padrao' else None
        )

        db.session.add(user)
        db.session.commit()

        logger.info(
            f"Usuário criado: {user.get_email()} por {current_user.get_email()}")
        audit_log('USER_CREATED', current_user.id,
                  {'new_user_email': user.get_email()})

        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': user.to_dict()
        }), 201

    except ValidationError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro em register: {str(e)}")
        return jsonify({'message': 'Erro interno do servidor'}), 500


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify({
        'user': current_user.to_dict()
    }), 200


@auth_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def list_users(current_user):
    try:
        users = User.query.all()
        return jsonify({
            'users': [user.to_dict() for user in users]
        }), 200
    except Exception as e:
        logger.error(f"Erro em list_users: {str(e)}")
        return jsonify({'message': 'Erro interno do servidor'}), 500


@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
@admin_required
@handle_validation_error
def update_user(current_user, user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'message': 'Usuário não encontrado'}), 404

        data = request.get_json()
        validar_json_data(data)

        if 'username' in data:
            username = validar_username(data['username'])
            # Verificar se o username já está em uso por outro usuário
            existing_user = User.query.filter_by(username=username).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'message': 'Username já está em uso'}), 400
            user.username = username

        if 'email' in data:
            email = validar_email(data['email'])
            # ATUALIZADO: Verificar se o email já está em uso usando método compatível com criptografia
            existing_user = User.find_by_email(email)
            if existing_user and existing_user.id != user_id:
                return jsonify({'message': 'Email já está em uso'}), 400
            user.set_email(email)  # ATUALIZADO: Usar método que criptografa

        if 'role' in data:
            role = validar_role(data['role'])
            user.role = role

        if 'obra_id' in data:
            obra_id = data['obra_id']
            if obra_id:
                obra = Obra.query.get(obra_id)
                if not obra:
                    return jsonify({'message': 'Obra não encontrada'}), 404
            user.obra_id = obra_id

        if 'ativo' in data:
            user.ativo = bool(data['ativo'])

        db.session.commit()

        logger.info(
            f"Usuário {user.get_email()} atualizado por {current_user.get_email()}")
        audit_log('USER_UPDATED', current_user.id, {
                  'updated_user_email': user.get_email()})

        return jsonify({
            'message': 'Usuário atualizado com sucesso',
            'user': user.to_dict()
        }), 200

    except ValidationError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro em update_user: {str(e)}")
        return jsonify({'message': 'Erro interno do servidor'}), 500


@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(current_user, user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'message': 'Usuário não encontrado'}), 404

        # Não permitir que o admin delete a si mesmo
        if user.id == current_user.id:
            return jsonify({'message': 'Não é possível deletar seu próprio usuário'}), 400

        email_deletado = user.get_email()
        db.session.delete(user)
        db.session.commit()

        logger.info(
            f"Usuário {email_deletado} deletado por {current_user.get_email()}")
        audit_log('USER_DELETED', current_user.id, {
                  'deleted_user_email': email_deletado})

        return jsonify({'message': 'Usuário deletado com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro em delete_user: {str(e)}")
        return jsonify({'message': 'Erro interno do servidor'}), 500


@csrf_bp.route('/csrf-token', methods=['GET'])
def get_csrf_token():
    token = generate_csrf_token()
    response = jsonify({'csrf_token': token})
    response.set_cookie('csrf_token', token, httponly=False, samesite='Lax')
    return response
