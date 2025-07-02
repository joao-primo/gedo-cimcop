from datetime import datetime
from models.user import db
from models.obra import Obra
from models.tipo_registro import TipoRegistro


class Registro(db.Model):
    __tablename__ = 'registros'

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False)
    tipo_registro = db.Column(db.String(50), nullable=False)
    data_registro = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow)
    codigo_numero = db.Column(db.String(50), nullable=True)
    descricao = db.Column(db.Text, nullable=False)

    caminho_anexo = db.Column(db.String(500), nullable=True)
    nome_arquivo_original = db.Column(db.String(200), nullable=True)
    formato_arquivo = db.Column(db.String(20), nullable=True)
    tamanho_arquivo = db.Column(db.Integer, nullable=True)

    autor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    obra_id = db.Column(db.Integer, db.ForeignKey('obras.id'), nullable=False)
    tipo_registro_id = db.Column(db.Integer, db.ForeignKey(
        'tipos_registro.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    autor = db.relationship('User')
    obra = db.relationship('Obra', overlaps="registros")
    tipo_registro_rel = db.relationship(
        'TipoRegistro', overlaps="registros,tipo_registro_obj")

    def __init__(self, titulo, tipo_registro, descricao, autor_id, obra_id,
                 data_registro=None, codigo_numero=None, caminho_anexo=None,
                 nome_arquivo_original=None, formato_arquivo=None, tamanho_arquivo=None,
                 tipo_registro_id=None):
        self.titulo = titulo
        self.tipo_registro = tipo_registro
        self.descricao = descricao
        self.autor_id = autor_id
        self.obra_id = obra_id
        self.data_registro = data_registro or datetime.utcnow()
        self.codigo_numero = codigo_numero
        self.caminho_anexo = caminho_anexo
        self.nome_arquivo_original = nome_arquivo_original
        self.formato_arquivo = formato_arquivo
        self.tamanho_arquivo = tamanho_arquivo
        self.tipo_registro_id = tipo_registro_id

    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'tipo_registro': self.tipo_registro,
            'tipo_registro_nome': self.tipo_registro_rel.nome if self.tipo_registro_rel else None,
            'data_registro': self.data_registro.isoformat() if self.data_registro else None,
            'autor_nome': self.autor.username if self.autor else None,
            'obra_nome': self.obra.nome if self.obra else None,
            # CORRIGIDO: URL para download direto
            'anexo_url': f"/api/registros/{self.id}/download" if self.caminho_anexo else None,
            'nome_arquivo_original': self.nome_arquivo_original,
        }
