from datetime import datetime, timedelta
import secrets
import hashlib
from models.user import db


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token_hash = db.Column(db.String(256), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45), nullable=True)  # Para auditoria
    user_agent = db.Column(db.String(500), nullable=True)  # Para auditoria

    # Relacionamento
    user = db.relationship('User', backref='reset_tokens')

    def __init__(self, user_id, ip_address=None, user_agent=None):
        self.user_id = user_id
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.expires_at = datetime.utcnow() + timedelta(hours=1)  # Token válido por 1 hora

        # Gerar token seguro
        self._raw_token = secrets.token_urlsafe(32)
        self.token_hash = hashlib.sha256(self._raw_token.encode()).hexdigest()

    def get_raw_token(self):
        """Retorna o token em texto plano (apenas na criação)"""
        return getattr(self, '_raw_token', None)

    @staticmethod
    def verify_token(raw_token):
        """Verifica se um token é válido e não expirado"""
        if not raw_token:
            return None

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        reset_token = PasswordResetToken.query.filter_by(
            token_hash=token_hash,
            used=False
        ).first()

        if not reset_token:
            return None

        # Verificar se não expirou
        if datetime.utcnow() > reset_token.expires_at:
            return None

        return reset_token

    def mark_as_used(self):
        """Marca o token como usado"""
        self.used = True
        db.session.commit()

    def is_expired(self):
        """Verifica se o token expirou"""
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expires_at': self.expires_at.isoformat(),
            'used': self.used,
            'created_at': self.created_at.isoformat(),
            'is_expired': self.is_expired()
        }

    @staticmethod
    def cleanup_expired_tokens():
        """Remove tokens expirados (executar periodicamente)"""
        expired_tokens = PasswordResetToken.query.filter(
            PasswordResetToken.expires_at < datetime.utcnow()
        ).all()

        for token in expired_tokens:
            db.session.delete(token)

        db.session.commit()
        return len(expired_tokens)
