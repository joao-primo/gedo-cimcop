from flask import Blueprint, request, jsonify
from models.registro import Registro, db
from models.obra import Obra
from routes.auth import token_required, obra_access_required
from sqlalchemy import func, desc, text
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/atividades-recentes', methods=['GET'])
@token_required
@obra_access_required
def get_atividades_recentes(current_user):
    try:
        # Parâmetros
        limit = request.args.get('limit', 10, type=int)
        dias = request.args.get('dias', 7, type=int)  # Últimos N dias

        # Data limite
        data_limite = datetime.utcnow() - timedelta(days=dias)

        # Query base
        query = Registro.query.filter(Registro.created_at >= data_limite)

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            query = query.filter_by(obra_id=current_user.obra_id)

        # Buscar atividades recentes
        atividades = query.order_by(
            desc(Registro.created_at)).limit(limit).all()

        return jsonify({
            'atividades_recentes': [registro.to_dict() for registro in atividades],
            'total': len(atividades),
            'periodo_dias': dias
        }), 200

    except Exception as e:
        print(f"Erro em atividades recentes: {str(e)}")
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@dashboard_bp.route('/estatisticas', methods=['GET'])
@token_required
@obra_access_required
def get_estatisticas(current_user):
    try:
        # Query base
        base_query = Registro.query

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            base_query = base_query.filter_by(obra_id=current_user.obra_id)

        # Total de registros
        total_registros = base_query.count()

        # Registros por tipo
        registros_por_tipo = db.session.query(
            Registro.tipo_registro,
            func.count(Registro.id).label('count')
        )

        if current_user.role == 'usuario_padrao':
            registros_por_tipo = registros_por_tipo.filter_by(
                obra_id=current_user.obra_id)

        registros_por_tipo = registros_por_tipo.group_by(
            Registro.tipo_registro).all()

        # Registros por classificação (com verificação se coluna existe)
        registros_por_classificacao = []
        try:
            # Verificar se a coluna existe antes de fazer a query
            db.session.execute(
                text("SELECT classificacao_grupo FROM registros LIMIT 1"))

            classificacao_query = db.session.query(
                Registro.classificacao_grupo,
                func.count(Registro.id).label('count')
            ).filter(Registro.classificacao_grupo.isnot(None))

            if current_user.role == 'usuario_padrao':
                classificacao_query = classificacao_query.filter_by(
                    obra_id=current_user.obra_id)

            registros_por_classificacao = classificacao_query.group_by(
                Registro.classificacao_grupo).all()
        except Exception as e:
            print(f"Coluna classificacao_grupo não existe ainda: {str(e)}")
            registros_por_classificacao = []

        # Registros dos últimos 30 dias
        data_limite_30d = datetime.utcnow() - timedelta(days=30)
        registros_ultimos_30d = base_query.filter(
            Registro.created_at >= data_limite_30d).count()

        # Registros por obra (apenas para admin)
        registros_por_obra = []
        if current_user.role == 'administrador':
            registros_por_obra = db.session.query(
                Obra.nome,
                Obra.id,
                func.count(Registro.id).label('count')
            ).outerjoin(Registro).group_by(Obra.id, Obra.nome).all()

        # Registros com anexo vs sem anexo
        registros_com_anexo = base_query.filter(
            (Registro.blob_url.isnot(None)) | (
                Registro.caminho_anexo.isnot(None))
        ).count()
        registros_sem_anexo = total_registros - registros_com_anexo

        return jsonify({
            'total_registros': total_registros,
            'registros_ultimos_30d': registros_ultimos_30d,
            'registros_por_tipo': [
                {'tipo': tipo, 'count': count}
                for tipo, count in registros_por_tipo
            ],
            'registros_por_classificacao': [
                {'grupo': grupo, 'count': count}
                for grupo, count in registros_por_classificacao
            ],
            'registros_por_obra': [
                {'obra_nome': nome, 'obra_id': obra_id, 'count': count}
                for nome, obra_id, count in registros_por_obra
            ],
            'registros_anexos': {
                'com_anexo': registros_com_anexo,
                'sem_anexo': registros_sem_anexo
            }
        }), 200

    except Exception as e:
        print(f"Erro em estatísticas: {str(e)}")
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@dashboard_bp.route('/resumo-obra/<int:obra_id>', methods=['GET'])
@token_required
@obra_access_required
def get_resumo_obra(current_user, obra_id):
    try:
        # Verificar se o usuário tem acesso a esta obra
        if current_user.role == 'usuario_padrao' and current_user.obra_id != obra_id:
            return jsonify({'message': 'Acesso negado a esta obra'}), 403

        # Verificar se a obra existe
        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        # Estatísticas da obra
        total_registros = Registro.query.filter_by(obra_id=obra_id).count()

        # Registros por tipo nesta obra
        registros_por_tipo = db.session.query(
            Registro.tipo_registro,
            func.count(Registro.id).label('count')
        ).filter_by(obra_id=obra_id).group_by(Registro.tipo_registro).all()

        # Últimos registros desta obra
        ultimos_registros = Registro.query.filter_by(obra_id=obra_id)\
            .order_by(desc(Registro.created_at)).limit(5).all()

        # Registros dos últimos 7 dias
        data_limite_7d = datetime.utcnow() - timedelta(days=7)
        registros_ultimos_7d = Registro.query.filter_by(obra_id=obra_id)\
            .filter(Registro.created_at >= data_limite_7d).count()

        return jsonify({
            'obra': obra.to_dict(),
            'total_registros': total_registros,
            'registros_ultimos_7d': registros_ultimos_7d,
            'registros_por_tipo': [
                {'tipo': tipo, 'count': count}
                for tipo, count in registros_por_tipo
            ],
            'ultimos_registros': [registro.to_dict() for registro in ultimos_registros]
        }), 200

    except Exception as e:
        print(f"Erro em resumo obra: {str(e)}")
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@dashboard_bp.route('/timeline', methods=['GET'])
@token_required
@obra_access_required
def get_timeline(current_user):
    try:
        # Parâmetros
        dias = request.args.get('dias', 30, type=int)
        obra_id = request.args.get('obra_id', type=int)

        # Data limite
        data_limite = datetime.utcnow() - timedelta(days=dias)

        # Query base
        query = Registro.query.filter(Registro.created_at >= data_limite)

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            query = query.filter_by(obra_id=current_user.obra_id)
        elif obra_id:
            query = query.filter_by(obra_id=obra_id)

        # Agrupar por data
        timeline = db.session.query(
            func.date(Registro.created_at).label('data'),
            func.count(Registro.id).label('count')
        )

        if current_user.role == 'usuario_padrao':
            timeline = timeline.filter_by(obra_id=current_user.obra_id)
        elif obra_id:
            timeline = timeline.filter_by(obra_id=obra_id)

        timeline = timeline.filter(Registro.created_at >= data_limite)\
            .group_by(func.date(Registro.created_at))\
            .order_by(func.date(Registro.created_at)).all()

        return jsonify({
            'timeline': [
                {'data': data.isoformat(), 'count': count}
                for data, count in timeline
            ],
            'periodo_dias': dias
        }), 200

    except Exception as e:
        print(f"Erro em timeline: {str(e)}")
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
