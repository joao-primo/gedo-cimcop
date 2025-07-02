from flask import Blueprint, request, jsonify
from models.configuracao_workflow import ConfiguracaoWorkflow, db
from models.obra import Obra
from models.tipo_registro import TipoRegistro
from routes.auth import token_required, admin_required
import json

workflow_bp = Blueprint('workflow', __name__)
workflow_bp.strict_slashes = False


@workflow_bp.route('/', methods=['GET'])
@token_required
def listar_workflows(current_user):
    """Lista configurações de workflow"""
    try:
        print(
            f"🔍 Listando workflows para usuário: {current_user.username} (role: {current_user.role})")

        # Filtrar por obra se usuário não for admin
        if current_user.role == 'administrador':
            workflows = ConfiguracaoWorkflow.query.all()
            print(f"📊 Admin - Total workflows encontrados: {len(workflows)}")
        else:
            if not current_user.obra_id:
                print("⚠️ Usuário sem obra_id definida")
                return jsonify({'workflows': []}), 200

            workflows = ConfiguracaoWorkflow.query.filter_by(
                obra_id=current_user.obra_id).all()
            print(
                f"👤 Usuário - Workflows da obra {current_user.obra_id}: {len(workflows)}")

        workflows_dict = []
        for workflow in workflows:
            try:
                workflows_dict.append(workflow.to_dict())
            except Exception as e:
                print(f"❌ Erro ao converter workflow {workflow.id}: {str(e)}")
                continue

        return jsonify({
            'workflows': workflows_dict
        }), 200

    except Exception as e:
        print(f"❌ Erro interno em listar_workflows: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'message': f'Erro interno: {str(e)}',
            'workflows': []
        }), 500


@workflow_bp.route('/obra/<int:obra_id>', methods=['GET'])
@token_required
def listar_workflows_obra(current_user, obra_id):
    """Lista workflows de uma obra específica"""
    try:
        # Verificar permissão
        if current_user.role != 'administrador' and current_user.obra_id != obra_id:
            return jsonify({'message': 'Acesso negado'}), 403

        workflows = ConfiguracaoWorkflow.query.filter_by(obra_id=obra_id).all()

        return jsonify({
            'workflows': [workflow.to_dict() for workflow in workflows]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@workflow_bp.route('/', methods=['POST'])
@token_required
def criar_workflow(current_user):
    """Cria nova configuração de workflow"""
    try:
        data = request.get_json()

        # Validações obrigatórias
        campos_obrigatorios = ['obra_id', 'nome', 'responsaveis_emails']
        for campo in campos_obrigatorios:
            if not data.get(campo):
                return jsonify({'message': f'Campo {campo} é obrigatório'}), 400

        obra_id = data['obra_id']

        # Verificar permissão
        if current_user.role != 'administrador' and current_user.obra_id != obra_id:
            return jsonify({'message': 'Acesso negado a esta obra'}), 403

        # Verificar se obra existe
        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        # Validar emails
        emails = data['responsaveis_emails']
        if not isinstance(emails, list) or len(emails) == 0:
            return jsonify({'message': 'Pelo menos um email responsável é obrigatório'}), 400

        # Criar workflow
        workflow = ConfiguracaoWorkflow(
            obra_id=obra_id,
            nome=data['nome'],
            descricao=data.get('descricao'),
            responsaveis_emails=emails,
            tipos_registro_ids=data.get('tipos_registro_ids', []),
            assunto_email=data.get('assunto_email'),
            template_email=data.get('template_email'),
            ativo=data.get('ativo', True),
            notificar_criacao=data.get('notificar_criacao', True),
            notificar_edicao=data.get('notificar_edicao', False),
            notificar_exclusao=data.get('notificar_exclusao', False)
        )

        db.session.add(workflow)
        db.session.commit()

        return jsonify({
            'message': 'Workflow criado com sucesso',
            'workflow': workflow.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@workflow_bp.route('/<int:workflow_id>', methods=['PUT'])
@token_required
def atualizar_workflow(current_user, workflow_id):
    """Atualiza configuração de workflow"""
    try:
        workflow = ConfiguracaoWorkflow.query.get(workflow_id)
        if not workflow:
            return jsonify({'message': 'Workflow não encontrado'}), 404

        # Verificar permissão
        if current_user.role != 'administrador' and current_user.obra_id != workflow.obra_id:
            return jsonify({'message': 'Acesso negado'}), 403

        data = request.get_json()

        # Atualizar campos
        if 'nome' in data:
            workflow.nome = data['nome']
        if 'descricao' in data:
            workflow.descricao = data['descricao']
        if 'responsaveis_emails' in data:
            workflow.responsaveis_emails = json.dumps(
                data['responsaveis_emails'])
        if 'tipos_registro_ids' in data:
            workflow.tipos_registro_ids = json.dumps(
                data['tipos_registro_ids'])
        if 'assunto_email' in data:
            workflow.assunto_email = data['assunto_email']
        if 'template_email' in data:
            workflow.template_email = data['template_email']
        if 'ativo' in data:
            workflow.ativo = data['ativo']
        if 'notificar_criacao' in data:
            workflow.notificar_criacao = data['notificar_criacao']
        if 'notificar_edicao' in data:
            workflow.notificar_edicao = data['notificar_edicao']
        if 'notificar_exclusao' in data:
            workflow.notificar_exclusao = data['notificar_exclusao']

        db.session.commit()

        return jsonify({
            'message': 'Workflow atualizado com sucesso',
            'workflow': workflow.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@workflow_bp.route('/<int:workflow_id>', methods=['DELETE'])
@token_required
def deletar_workflow(current_user, workflow_id):
    """Deleta configuração de workflow"""
    try:
        workflow = ConfiguracaoWorkflow.query.get(workflow_id)
        if not workflow:
            return jsonify({'message': 'Workflow não encontrado'}), 404

        # Verificar permissão
        if current_user.role != 'administrador' and current_user.obra_id != workflow.obra_id:
            return jsonify({'message': 'Acesso negado'}), 403

        db.session.delete(workflow)
        db.session.commit()

        return jsonify({'message': 'Workflow deletado com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@workflow_bp.route('/dados-auxiliares', methods=['GET'])
@token_required
def obter_dados_auxiliares(current_user):
    """Obtém dados auxiliares para configuração de workflows"""
    try:
        # Obras disponíveis
        if current_user.role == 'administrador':
            obras = Obra.query.all()
        else:
            obras = Obra.query.filter_by(id=current_user.obra_id).all()

        # Tipos de registro
        tipos_registro = TipoRegistro.query.all()

        return jsonify({
            'obras': [{'id': obra.id, 'nome': obra.nome, 'codigo': obra.codigo} for obra in obras],
            'tipos_registro': [{'id': tipo.id, 'nome': tipo.nome} for tipo in tipos_registro]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@workflow_bp.route('/<int:workflow_id>/testar', methods=['POST'])
@token_required
def testar_workflow(current_user, workflow_id):
    """Testa um workflow enviando email de teste"""
    try:
        workflow = ConfiguracaoWorkflow.query.get(workflow_id)
        if not workflow:
            return jsonify({'message': 'Workflow não encontrado'}), 404

        # Verificar permissão
        if current_user.role != 'administrador' and current_user.obra_id != workflow.obra_id:
            return jsonify({'message': 'Acesso negado'}), 403

        # Simular envio de email de teste
        print(f"🧪 TESTE DE WORKFLOW: {workflow.nome}")
        print(f"📧 Emails: {workflow.get_responsaveis_emails()}")
        print(f"🏗️ Obra: {workflow.obra.nome}")

        return jsonify({
            'message': 'Teste de workflow executado com sucesso',
            'resultado': {
                'sucesso': True,
                'emails_destino': workflow.get_responsaveis_emails(),
                'mensagem': 'Email de teste simulado com sucesso'
            }
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
