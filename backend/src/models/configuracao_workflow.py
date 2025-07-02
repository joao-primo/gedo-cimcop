from datetime import datetime
from models.user import db
import json


class ConfiguracaoWorkflow(db.Model):
    __tablename__ = 'configuracoes_workflow'

    id = db.Column(db.Integer, primary_key=True)
    obra_id = db.Column(db.Integer, db.ForeignKey('obras.id'), nullable=False)
    nome = db.Column(db.String(200), nullable=False)  # Nome da configuração
    descricao = db.Column(db.Text, nullable=True)

    # Filtros opcionais
    # JSON array com IDs dos tipos
    tipos_registro_ids = db.Column(db.Text, nullable=True)

    # Configurações de notificação
    responsaveis_emails = db.Column(
        db.Text, nullable=False)  # JSON array com emails
    assunto_email = db.Column(db.String(200), nullable=True)
    template_email = db.Column(db.Text, nullable=True)

    # Configurações de ativação
    ativo = db.Column(db.Boolean, default=True)
    notificar_criacao = db.Column(db.Boolean, default=True)
    notificar_edicao = db.Column(db.Boolean, default=False)
    notificar_exclusao = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    obra = db.relationship('Obra', backref='configuracoes_workflow')

    def __init__(self, obra_id, nome, responsaveis_emails, descricao=None,
                 tipos_registro_ids=None, assunto_email=None, template_email=None,
                 ativo=True, notificar_criacao=True, notificar_edicao=False, notificar_exclusao=False):
        self.obra_id = obra_id
        self.nome = nome
        self.descricao = descricao
        self.responsaveis_emails = json.dumps(responsaveis_emails) if isinstance(
            responsaveis_emails, list) else responsaveis_emails
        self.tipos_registro_ids = json.dumps(tipos_registro_ids) if isinstance(
            tipos_registro_ids, list) else tipos_registro_ids
        self.assunto_email = assunto_email or f"Novo registro adicionado - {nome}"
        self.template_email = template_email
        self.ativo = ativo
        self.notificar_criacao = notificar_criacao
        self.notificar_edicao = notificar_edicao
        self.notificar_exclusao = notificar_exclusao

    def get_responsaveis_emails(self):
        """Retorna lista de emails dos responsáveis"""
        try:
            return json.loads(self.responsaveis_emails) if self.responsaveis_emails else []
        except:
            return []

    def get_tipos_registro_ids(self):
        """Retorna lista de IDs dos tipos de registro"""
        try:
            return json.loads(self.tipos_registro_ids) if self.tipos_registro_ids else []
        except:
            return []

    def deve_notificar(self, tipo_registro_id=None, acao='criacao'):
        """Verifica se deve notificar baseado nos filtros"""
        if not self.ativo:
            return False

        # Verificar tipo de ação
        if acao == 'criacao' and not self.notificar_criacao:
            return False
        elif acao == 'edicao' and not self.notificar_edicao:
            return False
        elif acao == 'exclusao' and not self.notificar_exclusao:
            return False

        # Verificar filtro de tipo de registro
        tipos_filtro = self.get_tipos_registro_ids()
        if tipos_filtro and tipo_registro_id and tipo_registro_id not in tipos_filtro:
            return False

        return True

    def to_dict(self):
        return {
            'id': self.id,
            'obra_id': self.obra_id,
            'obra_nome': self.obra.nome if self.obra else None,
            'nome': self.nome,
            'descricao': self.descricao,
            'responsaveis_emails': self.get_responsaveis_emails(),
            'tipos_registro_ids': self.get_tipos_registro_ids(),
            'assunto_email': self.assunto_email,
            'template_email': self.template_email,
            'ativo': self.ativo,
            'notificar_criacao': self.notificar_criacao,
            'notificar_edicao': self.notificar_edicao,
            'notificar_exclusao': self.notificar_exclusao,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
