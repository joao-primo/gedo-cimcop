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

    # NOVO: Campos de classificação
    classificacao_grupo = db.Column(db.String(100), nullable=True)
    classificacao_subgrupo = db.Column(db.String(100), nullable=True)
    classificacao_id = db.Column(db.Integer, db.ForeignKey(
        'classificacoes.id'), nullable=True)

    # ATUALIZADO: Campos para Vercel Blob
    # Mantido para compatibilidade
    caminho_anexo = db.Column(db.String(500), nullable=True)
    blob_url = db.Column(db.String(500), nullable=True)  # URL do Vercel Blob
    # Pathname para deletar
    blob_pathname = db.Column(db.String(500), nullable=True)
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
    classificacao_rel = db.relationship('Classificacao', backref='registros')

    def __init__(self, titulo, tipo_registro, descricao, autor_id, obra_id,
                 data_registro=None, codigo_numero=None, caminho_anexo=None,
                 nome_arquivo_original=None, formato_arquivo=None, tamanho_arquivo=None,
                 tipo_registro_id=None, blob_url=None, blob_pathname=None,
                 classificacao_grupo=None, classificacao_subgrupo=None, classificacao_id=None):
        self.titulo = titulo
        self.tipo_registro = tipo_registro
        self.descricao = descricao
        self.autor_id = autor_id
        self.obra_id = obra_id
        self.data_registro = data_registro or datetime.utcnow()
        self.codigo_numero = codigo_numero
        self.caminho_anexo = caminho_anexo
        self.blob_url = blob_url
        self.blob_pathname = blob_pathname
        self.nome_arquivo_original = nome_arquivo_original
        self.formato_arquivo = formato_arquivo
        self.tamanho_arquivo = tamanho_arquivo
        self.tipo_registro_id = tipo_registro_id
        self.classificacao_grupo = classificacao_grupo
        self.classificacao_subgrupo = classificacao_subgrupo
        self.classificacao_id = classificacao_id

    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'tipo_registro': self.tipo_registro,
            'tipo_registro_nome': self.tipo_registro_rel.nome if self.tipo_registro_rel else None,
            'classificacao_grupo': self.classificacao_grupo,
            'classificacao_subgrupo': self.classificacao_subgrupo,
            'data_registro': self.data_registro.isoformat() if self.data_registro else None,
            'codigo_numero': self.codigo_numero,
            'autor_nome': self.autor.username if self.autor else None,
            'obra_nome': self.obra.nome if self.obra else None,
            'obra_codigo': self.obra.codigo if self.obra else None,
            # CORREÇÃO CRÍTICA: SEMPRE usar URL do backend, nunca Blob diretamente
            'anexo_url': f"/api/registros/{self.id}/download" if (self.blob_url or self.caminho_anexo) else None,
            'nome_arquivo_original': self.nome_arquivo_original,
            'formato_arquivo': self.formato_arquivo,
            'tamanho_arquivo': self.tamanho_arquivo,
            'tem_anexo': bool(self.blob_url or self.caminho_anexo),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
