from datetime import datetime
from models.user import db


class TipoRegistro(db.Model):
    __tablename__ = 'tipos_registro'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    descricao = db.Column(db.Text, nullable=True)
    ativo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamento com registros
    registros = db.relationship(
        'Registro', backref='tipo_registro_obj', lazy=True)

    def __init__(self, nome, descricao=None, ativo=True):
        self.nome = nome
        self.descricao = descricao
        self.ativo = ativo

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
