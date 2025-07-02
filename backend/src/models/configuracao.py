from datetime import datetime
from models.user import db


class Configuracao(db.Model):
    __tablename__ = 'configuracoes'

    id = db.Column(db.Integer, primary_key=True)
    chave = db.Column(db.String(100), nullable=False, unique=True)
    valor = db.Column(db.Text, nullable=True)
    descricao = db.Column(db.String(255), nullable=True)
    # string, boolean, integer, json
    tipo = db.Column(db.String(50), nullable=False, default='string')
    # geral, sistema, notificacao, seguranca
    categoria = db.Column(db.String(50), nullable=False, default='geral')
    # Se usuário comum pode editar
    editavel_usuario = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, chave, valor=None, descricao=None, tipo='string', categoria='geral', editavel_usuario=False):
        self.chave = chave
        self.valor = valor
        self.descricao = descricao
        self.tipo = tipo
        self.categoria = categoria
        self.editavel_usuario = editavel_usuario

    def to_dict(self):
        return {
            'id': self.id,
            'chave': self.chave,
            'valor': self.get_valor_tipado(),
            'descricao': self.descricao,
            'tipo': self.tipo,
            'categoria': self.categoria,
            'editavel_usuario': self.editavel_usuario,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def get_valor_tipado(self):
        """Retorna o valor convertido para o tipo correto"""
        if self.valor is None:
            return None

        if self.tipo == 'boolean':
            return self.valor.lower() in ('true', '1', 'yes', 'on')
        elif self.tipo == 'integer':
            try:
                return int(self.valor)
            except (ValueError, TypeError):
                return 0
        elif self.tipo == 'json':
            try:
                import json
                return json.loads(self.valor)
            except (ValueError, TypeError):
                return {}
        else:
            return self.valor

    def set_valor_tipado(self, valor):
        """Define o valor convertendo para string"""
        if valor is None:
            self.valor = None
        elif self.tipo == 'json':
            import json
            self.valor = json.dumps(valor)
        else:
            self.valor = str(valor)


class ConfiguracaoUsuario(db.Model):
    __tablename__ = 'configuracoes_usuario'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    chave = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraint para evitar duplicatas
    __table_args__ = (db.UniqueConstraint(
        'user_id', 'chave', name='unique_user_config'),)

    user = db.relationship('User', backref='configuracoes')

    def __init__(self, user_id, chave, valor=None):
        self.user_id = user_id
        self.chave = chave
        self.valor = valor

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'chave': self.chave,
            'valor': self.valor,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
