from datetime import datetime
from models.user import db


class Classificacao(db.Model):
    __tablename__ = 'classificacoes'

    id = db.Column(db.Integer, primary_key=True)
    grupo = db.Column(db.String(100), nullable=False)
    subgrupo = db.Column(db.String(100), nullable=False)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, grupo, subgrupo, ativo=True):
        self.grupo = grupo
        self.subgrupo = subgrupo
        self.ativo = ativo

    def to_dict(self):
        return {
            'id': self.id,
            'grupo': self.grupo,
            'subgrupo': self.subgrupo,
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def get_grupos():
        """Retorna todos os grupos únicos"""
        grupos = db.session.query(Classificacao.grupo).filter_by(
            ativo=True).distinct().all()
        return [grupo[0] for grupo in grupos]

    @staticmethod
    def get_subgrupos_por_grupo(grupo):
        """Retorna todos os subgrupos de um grupo específico"""
        subgrupos = db.session.query(Classificacao).filter_by(
            grupo=grupo, ativo=True).all()
        return [classificacao.to_dict() for classificacao in subgrupos]

    @staticmethod
    def get_classificacoes_agrupadas():
        """Retorna classificações agrupadas por grupo"""
        classificacoes = db.session.query(Classificacao).filter_by(
            ativo=True).order_by(Classificacao.grupo, Classificacao.subgrupo).all()

        grupos = {}
        for classificacao in classificacoes:
            if classificacao.grupo not in grupos:
                grupos[classificacao.grupo] = []
            grupos[classificacao.grupo].append(classificacao.to_dict())

        return grupos
