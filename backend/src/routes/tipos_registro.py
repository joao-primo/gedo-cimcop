from flask import Blueprint, request, jsonify
from models.tipo_registro import TipoRegistro, db
from routes.auth import token_required, admin_required

tipos_registro_bp = Blueprint('tipos_registro', __name__)


@tipos_registro_bp.route('/', methods=['GET'])
@token_required
def list_tipos_registro(current_user):
    try:
        # Buscar apenas tipos ativos
        tipos = TipoRegistro.query.filter_by(ativo=True).all()

        return jsonify({
            'tipos_registro': [tipo.to_dict() for tipo in tipos]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@tipos_registro_bp.route('/all', methods=['GET'])
@token_required
@admin_required
def list_all_tipos_registro(current_user):
    try:
        # Buscar todos os tipos (incluindo inativos) - apenas para admin
        tipos = TipoRegistro.query.all()

        return jsonify({
            'tipos_registro': [tipo.to_dict() for tipo in tipos]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@tipos_registro_bp.route('/<int:tipo_id>', methods=['GET'])
@token_required
def get_tipo_registro(current_user, tipo_id):
    try:
        tipo = TipoRegistro.query.get(tipo_id)
        if not tipo:
            return jsonify({'message': 'Tipo de registro não encontrado'}), 404

        return jsonify({
            'tipo_registro': tipo.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@tipos_registro_bp.route('/', methods=['POST'])
@token_required
@admin_required
def create_tipo_registro(current_user):
    try:
        data = request.get_json()

        if not data.get('nome'):
            return jsonify({'message': 'Nome é obrigatório'}), 400

        # Verificar se o nome já existe
        if TipoRegistro.query.filter_by(nome=data['nome']).first():
            return jsonify({'message': 'Tipo de registro com este nome já existe'}), 400

        tipo = TipoRegistro(
            nome=data['nome'],
            descricao=data.get('descricao', ''),
            ativo=data.get('ativo', True)
        )

        db.session.add(tipo)
        db.session.commit()

        return jsonify({
            'message': 'Tipo de registro criado com sucesso',
            'tipo_registro': tipo.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@tipos_registro_bp.route('/<int:tipo_id>', methods=['PUT'])
@token_required
@admin_required
def update_tipo_registro(current_user, tipo_id):
    try:
        tipo = TipoRegistro.query.get(tipo_id)
        if not tipo:
            return jsonify({'message': 'Tipo de registro não encontrado'}), 404

        data = request.get_json()

        if 'nome' in data:
            # Verificar se o novo nome já existe em outro tipo
            existing_tipo = TipoRegistro.query.filter_by(
                nome=data['nome']).first()
            if existing_tipo and existing_tipo.id != tipo_id:
                return jsonify({'message': 'Tipo de registro com este nome já existe'}), 400
            tipo.nome = data['nome']

        if 'descricao' in data:
            tipo.descricao = data['descricao']

        if 'ativo' in data:
            tipo.ativo = data['ativo']

        db.session.commit()

        return jsonify({
            'message': 'Tipo de registro atualizado com sucesso',
            'tipo_registro': tipo.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@tipos_registro_bp.route('/<int:tipo_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_tipo_registro(current_user, tipo_id):
    try:
        tipo = TipoRegistro.query.get(tipo_id)
        if not tipo:
            return jsonify({'message': 'Tipo de registro não encontrado'}), 404

        # Verificar se há registros usando este tipo
        from src.models.registro import Registro
        registros_associados = Registro.query.filter_by(
            tipo_registro_id=tipo_id).count()
        if registros_associados > 0:
            return jsonify({'message': 'Não é possível deletar tipo de registro com registros associados'}), 400

        db.session.delete(tipo)
        db.session.commit()

        return jsonify({'message': 'Tipo de registro deletado com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
