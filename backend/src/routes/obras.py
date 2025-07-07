from flask import Blueprint, request, jsonify
from models.obra import Obra, db
from models.user import User  # ✅ importado no topo
from routes.auth import token_required, admin_required, obra_access_required
from datetime import datetime

obras_bp = Blueprint('obras', __name__)
obras_bp.strict_slashes = False  # ✅ aceita rota com ou sem barra final


@obras_bp.route('/', methods=['GET'])
@token_required
@obra_access_required
def list_obras(current_user):
    try:
        if current_user.role == 'administrador':
            obras = Obra.query.all()
        else:
            obras = Obra.query.filter_by(id=current_user.obra_id).all()

        return jsonify({'obras': [obra.to_dict() for obra in obras]}), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@obras_bp.route('/<int:obra_id>', methods=['GET'])
@token_required
@obra_access_required
def get_obra(current_user, obra_id):
    try:
        if current_user.role == 'usuario_padrao' and current_user.obra_id != obra_id:
            return jsonify({'message': 'Acesso negado a esta obra'}), 403

        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        return jsonify({'obra': obra.to_dict()}), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@obras_bp.route('/', methods=['POST'])
@token_required
@admin_required
def create_obra(current_user):
    try:
        data = request.get_json()
        required_fields = ['nome', 'codigo', 'cliente', 'data_inicio',
                           'responsavel_tecnico', 'responsavel_administrativo',
                           'localizacao', 'status']

        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'Campo {field} é obrigatório'}), 400

        if Obra.query.filter_by(codigo=data['codigo']).first():
            return jsonify({'message': 'Código da obra já existe'}), 400

        try:
            data_inicio = datetime.strptime(
                data['data_inicio'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Formato de data_inicio inválido (use YYYY-MM-DD)'}), 400

        data_termino = None
        if data.get('data_termino'):
            try:
                data_termino = datetime.strptime(
                    data['data_termino'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'Formato de data_termino inválido (use YYYY-MM-DD)'}), 400

        obra = Obra(
            nome=data['nome'],
            descricao=data.get('descricao', ''),
            codigo=data['codigo'],
            cliente=data['cliente'],
            data_inicio=data_inicio,
            data_termino=data_termino,
            responsavel_tecnico=data['responsavel_tecnico'],
            responsavel_administrativo=data['responsavel_administrativo'],
            localizacao=data['localizacao'],
            status=data['status']
        )

        db.session.add(obra)
        db.session.commit()

        return jsonify({'message': 'Obra criada com sucesso', 'obra': obra.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@obras_bp.route('/<int:obra_id>', methods=['PUT'])
@token_required
@admin_required
def update_obra(current_user, obra_id):
    try:
        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        data = request.get_json()

        if 'nome' in data:
            obra.nome = data['nome']
        if 'descricao' in data:
            obra.descricao = data['descricao']
        if 'codigo' in data:
            existing_obra = Obra.query.filter_by(codigo=data['codigo']).first()
            if existing_obra and existing_obra.id != obra_id:
                return jsonify({'message': 'Código da obra já existe'}), 400
            obra.codigo = data['codigo']
        if 'cliente' in data:
            obra.cliente = data['cliente']
        if 'data_inicio' in data:
            try:
                obra.data_inicio = datetime.strptime(
                    data['data_inicio'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'Formato de data_inicio inválido (use YYYY-MM-DD)'}), 400
        if 'data_termino' in data:
            if data['data_termino']:
                try:
                    obra.data_termino = datetime.strptime(
                        data['data_termino'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'message': 'Formato de data_termino inválido (use YYYY-MM-DD)'}), 400
            else:
                obra.data_termino = None
        if 'responsavel_tecnico' in data:
            obra.responsavel_tecnico = data['responsavel_tecnico']
        if 'responsavel_administrativo' in data:
            obra.responsavel_administrativo = data['responsavel_administrativo']
        if 'localizacao' in data:
            obra.localizacao = data['localizacao']
        if 'status' in data:
            obra.status = data['status']

        db.session.commit()

        return jsonify({'message': 'Obra atualizada com sucesso', 'obra': obra.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@obras_bp.route('/<int:obra_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_obra(current_user, obra_id):
    try:
        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        usuarios_associados = User.query.filter_by(obra_id=obra_id).count()
        if usuarios_associados > 0:
            return jsonify({'message': 'Não é possível deletar obra com usuários associados'}), 400

        db.session.delete(obra)
        db.session.commit()

        return jsonify({'message': 'Obra deletada com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
