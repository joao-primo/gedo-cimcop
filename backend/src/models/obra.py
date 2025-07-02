from datetime import datetime
from models.user import db


class Obra(db.Model):
    __tablename__ = 'obras'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    codigo = db.Column(db.String(50), nullable=False, unique=True)
    cliente = db.Column(db.String(200), nullable=False)
    data_inicio = db.Column(db.Date, nullable=False)
    data_termino = db.Column(db.Date, nullable=True)
    responsavel_tecnico = db.Column(db.String(200), nullable=False)
    responsavel_administrativo = db.Column(db.String(200), nullable=False)
    localizacao = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamento com registros (sem backref)
    registros = db.relationship(
        'Registro',
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __init__(self, nome, descricao, codigo, cliente, data_inicio, responsavel_tecnico,
                 responsavel_administrativo, localizacao, status, data_termino=None):
        self.nome = nome
        self.descricao = descricao
        self.codigo = codigo
        self.cliente = cliente
        self.data_inicio = data_inicio
        self.data_termino = data_termino
        self.responsavel_tecnico = responsavel_tecnico
        self.responsavel_administrativo = responsavel_administrativo
        self.localizacao = localizacao
        self.status = status

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'codigo': self.codigo,
            'cliente': self.cliente,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_termino': self.data_termino.isoformat() if self.data_termino else None,
            'responsavel_tecnico': self.responsavel_tecnico,
            'responsavel_administrativo': self.responsavel_administrativo,
            'localizacao': self.localizacao,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
