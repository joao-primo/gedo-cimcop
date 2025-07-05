from flask import Blueprint, request, jsonify
from models.classificacao import Classificacao, db
from routes.auth import token_required
from sqlalchemy import or_

classificacoes_bp = Blueprint('classificacoes', __name__)


@classificacoes_bp.route('/', methods=['GET'])
@token_required
def listar_classificacoes(current_user):
    try:
        # Buscar todas as classificações ativas
        classificacoes = Classificacao.query.filter_by(ativo=True).order_by(
            Classificacao.grupo, Classificacao.subgrupo
        ).all()

        # Organizar por grupo e subgrupo
        grupos = {}
        for classificacao in classificacoes:
            if classificacao.grupo not in grupos:
                grupos[classificacao.grupo] = {}

            if classificacao.subgrupo not in grupos[classificacao.grupo]:
                grupos[classificacao.grupo][classificacao.subgrupo] = []

            grupos[classificacao.grupo][classificacao.subgrupo].append({
                'id': classificacao.id,
                'subgrupo': classificacao.subgrupo
            })

        return jsonify({
            'classificacoes': grupos,
            'total': len(classificacoes)
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@classificacoes_bp.route('/grupos', methods=['GET'])
@token_required
def listar_grupos(current_user):
    try:
        grupos = Classificacao.get_grupos()
        return jsonify({
            'grupos': grupos
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@classificacoes_bp.route('/subgrupos/<grupo>', methods=['GET'])
@token_required
def listar_subgrupos_por_grupo(current_user, grupo):
    try:
        subgrupos = Classificacao.get_subgrupos_por_grupo(grupo)
        return jsonify({
            'subgrupos': subgrupos
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@classificacoes_bp.route('/', methods=['POST'])
@token_required
def criar_classificacao(current_user):
    try:
        if current_user.role != 'administrador':
            return jsonify({'message': 'Acesso negado'}), 403

        data = request.get_json()

        if not data or not data.get('grupo') or not data.get('subgrupo'):
            return jsonify({'message': 'Grupo e subgrupo são obrigatórios'}), 400

        # Verificar se já existe
        classificacao_existente = Classificacao.query.filter_by(
            grupo=data['grupo'],
            subgrupo=data['subgrupo']
        ).first()

        if classificacao_existente:
            return jsonify({'message': 'Classificação já existe'}), 400

        nova_classificacao = Classificacao(
            grupo=data['grupo'],
            subgrupo=data['subgrupo'],
            ativo=data.get('ativo', True)
        )

        db.session.add(nova_classificacao)
        db.session.commit()

        return jsonify({
            'message': 'Classificação criada com sucesso',
            'classificacao': nova_classificacao.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@classificacoes_bp.route('/<int:classificacao_id>', methods=['PUT'])
@token_required
def atualizar_classificacao(current_user, classificacao_id):
    try:
        if current_user.role != 'administrador':
            return jsonify({'message': 'Acesso negado'}), 403

        classificacao = Classificacao.query.get(classificacao_id)
        if not classificacao:
            return jsonify({'message': 'Classificação não encontrada'}), 404

        data = request.get_json()

        if data.get('grupo'):
            classificacao.grupo = data['grupo']
        if data.get('subgrupo'):
            classificacao.subgrupo = data['subgrupo']
        if 'ativo' in data:
            classificacao.ativo = data['ativo']

        db.session.commit()

        return jsonify({
            'message': 'Classificação atualizada com sucesso',
            'classificacao': classificacao.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@classificacoes_bp.route('/<int:classificacao_id>', methods=['DELETE'])
@token_required
def deletar_classificacao(current_user, classificacao_id):
    try:
        if current_user.role != 'administrador':
            return jsonify({'message': 'Acesso negado'}), 403

        classificacao = Classificacao.query.get(classificacao_id)
        if not classificacao:
            return jsonify({'message': 'Classificação não encontrada'}), 404

        # Soft delete - apenas marcar como inativo
        classificacao.ativo = False
        db.session.commit()

        return jsonify({
            'message': 'Classificação desativada com sucesso'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
