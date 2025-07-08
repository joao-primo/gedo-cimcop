from datetime import datetime, timedelta
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
import os
from flask_sqlalchemy import SQLAlchemy
import bcrypt

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='usuario_padrao')
    obra_id = db.Column(db.Integer, db.ForeignKey('obras.id'), nullable=True)
    must_change_password = db.Column(db.Boolean, default=True)
    ativo = db.Column(db.Boolean, default=True)
    ultimo_login = db.Column(db.DateTime, nullable=True)
    password_changed_at = db.Column(db.DateTime, nullable=True)
    password_changed_by_admin = db.Column(db.Boolean, default=False)
    last_admin_password_change = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    obra = db.relationship("Obra", backref="usuarios", lazy=True)

    def __init__(self, username, email, password, role='usuario_padrao', obra_id=None, must_change_password=True):
        self.username = username
        self.email = email
        self.set_password(password)
        self.role = role
        self.obra_id = obra_id
        self.must_change_password = must_change_password
        self.ativo = True
        self.password_changed_by_admin = False

    def check_password(self, password):
        if not self.password_hash:
            return False
        try:
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Erro ao verificar senha (possível hash antigo ou corrompido): {e}")
            return False

    def set_password(self, new_password, changed_by_admin=False):
        """Define nova senha com controles de segurança usando bcrypt"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')
        self.password_changed_at = datetime.utcnow()

        if changed_by_admin:
            # Senha alterada pelo admin - usuário deve trocar no próximo login
            self.must_change_password = True
            self.password_changed_by_admin = True
        else:
            # Senha alterada pelo próprio usuário
            self.must_change_password = False
            self.password_changed_by_admin = False

            # Se for admin alterando própria senha, registrar data
            if self.role == 'administrador':
                self.last_admin_password_change = datetime.utcnow()

    def can_change_own_password(self):
        """Verifica se admin pode alterar própria senha (15 dias)"""
        if self.role != 'administrador':
            return True, "Usuário comum pode alterar senha a qualquer momento"

        if not self.last_admin_password_change:
            return True, "Primeira alteração de senha permitida"

        days_since_change = (datetime.utcnow() -
                             self.last_admin_password_change).days
        if days_since_change >= 15:
            return True, "Período de 15 dias cumprido"

        remaining_days = 15 - days_since_change
        return False, f"Aguarde {remaining_days} dias para alterar novamente"

    def get_password_status(self):
        """Retorna status da senha para interface"""
        status = {
            'must_change': self.must_change_password,
            'changed_by_admin': self.password_changed_by_admin,
            'last_change': self.password_changed_at.isoformat() if self.password_changed_at else None,
            'can_change_own': True
        }

        if self.role == 'administrador':
            can_change, message = self.can_change_own_password()
            status['can_change_own'] = can_change
            status['change_restriction_message'] = message

            if self.last_admin_password_change:
                days_since = (datetime.utcnow() -
                              self.last_admin_password_change).days
                status['days_since_last_change'] = days_since
                status['next_change_allowed'] = (
                    self.last_admin_password_change + timedelta(days=15)).isoformat()

        return status

    def generate_token(self):
        payload = {
            'user_id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'obra_id': self.obra_id,
            'must_change_password': self.must_change_password,
            'password_changed_by_admin': self.password_changed_by_admin,
            'exp': datetime.utcnow() + timedelta(days=1)
        }
        return jwt.encode(
            payload,
            os.getenv('SECRET_KEY', 'default-secret-key'),
            algorithm='HS256'
        )

    @staticmethod
    def verify_token(token):
        try:
            payload = jwt.decode(
                token,
                os.getenv('SECRET_KEY', 'default-secret-key'),
                algorithms=['HS256']
            )
            return payload
        except jwt.ExpiredSignatureError:
            return {'error': 'Token expirado. Faça login novamente.'}
        except jwt.InvalidTokenError:
            return {'error': 'Token inválido. Faça login novamente.'}

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'obra_id': self.obra_id,
            'must_change_password': self.must_change_password,
            'password_changed_by_admin': self.password_changed_by_admin,
            'ativo': self.ativo,
            'ultimo_login': self.ultimo_login.isoformat() if self.ultimo_login else None,
            'password_changed_at': self.password_changed_at.isoformat() if self.password_changed_at else None,
            'last_admin_password_change': self.last_admin_password_change.isoformat() if self.last_admin_password_change else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'password_status': self.get_password_status()
        }
