from flask import Blueprint, request, jsonify
from models.classificacao import Classificacao, db
from routes.auth import token_required, admin_required

classificacoes_bp = Blueprint('classificacoes', __name__)


@classificacoes_bp.route('/', methods=['GET'])
@token_required
def listar_classificacoes(current_user):
    try:
        classificacoes = Classificacao.get_classificacoes_agrupadas()
        return jsonify({
            'classificacoes': classificacoes,
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
            'grupos': grupos,
            'total': len(grupos)
        }), 200
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@classificacoes_bp.route('/subgrupos/<grupo>', methods=['GET'])
@token_required
def listar_subgrupos(current_user, grupo):
    try:
        subgrupos = Classificacao.get_subgrupos_por_grupo(grupo)
        return jsonify({
            'subgrupos': subgrupos,
            'total': len(subgrupos)
        }), 200
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@classificacoes_bp.route('/', methods=['POST'])
@token_required
@admin_required
def criar_classificacao(current_user):
    try:
        data = request.get_json()

        if not data.get('grupo') or not data.get('subgrupo'):
            return jsonify({'message': 'Grupo e subgrupo são obrigatórios'}), 400

        # Verificar se já existe
        existente = Classificacao.query.filter_by(
            grupo=data['grupo'],
            subgrupo=data['subgrupo']
        ).first()

        if existente:
            return jsonify({'message': 'Classificação já existe'}), 400

        classificacao = Classificacao(
            grupo=data['grupo'],
            subgrupo=data['subgrupo'],
            ativo=data.get('ativo', True)
        )

        db.session.add(classificacao)
        db.session.commit()

        return jsonify({
            'message': 'Classificação criada com sucesso',
            'classificacao': classificacao.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@classificacoes_bp.route('/<int:classificacao_id>', methods=['PUT'])
@token_required
@admin_required
def atualizar_classificacao(current_user, classificacao_id):
    try:
        classificacao = Classificacao.query.get(classificacao_id)
        if not classificacao:
            return jsonify({'message': 'Classificação não encontrada'}), 404

        data = request.get_json()

        if 'grupo' in data:
            classificacao.grupo = data['grupo']
        if 'subgrupo' in data:
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
@admin_required
def deletar_classificacao(current_user, classificacao_id):
    try:
        classificacao = Classificacao.query.get(classificacao_id)
        if not classificacao:
            return jsonify({'message': 'Classificação não encontrada'}), 404

        db.session.delete(classificacao)
        db.session.commit()

        return jsonify({'message': 'Classificação deletada com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
