from flask import Blueprint, request, jsonify
from models.registro import Registro, db
from models.user import User
from models.obra import Obra
from models.tipo_registro import TipoRegistro
from models.classificacao import Classificacao
from routes.auth import token_required, obra_access_required
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
import calendar

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/estatisticas', methods=['GET'])
@token_required
@obra_access_required
def get_estatisticas(current_user):
    try:
        # Parâmetros de filtro
        obra_id = request.args.get('obra_id', type=int)

        # Query base
        query = Registro.query

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            query = query.filter_by(obra_id=current_user.obra_id)
        elif obra_id:
            query = query.filter_by(obra_id=obra_id)

        # Total de registros
        total_registros = query.count()

        # Registros dos últimos 30 dias
        data_limite = datetime.utcnow() - timedelta(days=30)
        registros_ultimos_30d = query.filter(
            Registro.created_at >= data_limite
        ).count()

        # Registros com anexo
        query_anexos = query.filter(
            or_(
                Registro.blob_url.isnot(None),
                Registro.caminho_anexo.isnot(None)
            )
        )
        registros_com_anexo = query_anexos.count()
        registros_sem_anexo = total_registros - registros_com_anexo

        # Registros por tipo
        registros_por_tipo_query = db.session.query(
            Registro.tipo_registro,
            func.count(Registro.id).label('count')
        )

        # Aplicar mesmo filtro de obra
        if current_user.role == 'usuario_padrao':
            registros_por_tipo_query = registros_por_tipo_query.filter_by(
                obra_id=current_user.obra_id)
        elif obra_id:
            registros_por_tipo_query = registros_por_tipo_query.filter_by(
                obra_id=obra_id)

        registros_por_tipo = registros_por_tipo_query.group_by(
            Registro.tipo_registro
        ).order_by(func.count(Registro.id).desc()).all()

        # Registros por classificação (grupo)
        registros_por_classificacao_query = db.session.query(
            Registro.classificacao_grupo,
            func.count(Registro.id).label('count')
        ).filter(Registro.classificacao_grupo.isnot(None))

        # Aplicar mesmo filtro de obra
        if current_user.role == 'usuario_padrao':
            registros_por_classificacao_query = registros_por_classificacao_query.filter_by(
                obra_id=current_user.obra_id)
        elif obra_id:
            registros_por_classificacao_query = registros_por_classificacao_query.filter_by(
                obra_id=obra_id)

        registros_por_classificacao = registros_por_classificacao_query.group_by(
            Registro.classificacao_grupo
        ).order_by(func.count(Registro.id).desc()).all()

        # Registros por obra (apenas para admin e quando não há filtro de obra específica)
        registros_por_obra = []
        if current_user.role == 'administrador' and not obra_id:
            registros_por_obra_query = db.session.query(
                Registro.obra_id,
                Obra.nome.label('obra_nome'),
                func.count(Registro.id).label('count')
            ).join(Obra, Registro.obra_id == Obra.id).group_by(
                Registro.obra_id, Obra.nome
            ).order_by(func.count(Registro.id).desc()).all()

            registros_por_obra = [
                {
                    'obra_id': item.obra_id,
                    'obra_nome': item.obra_nome,
                    'count': item.count
                }
                for item in registros_por_obra_query
            ]

        return jsonify({
            'total_registros': total_registros,
            'registros_ultimos_30d': registros_ultimos_30d,
            'registros_anexos': {
                'com_anexo': registros_com_anexo,
                'sem_anexo': registros_sem_anexo
            },
            'registros_por_tipo': [
                {'tipo': item.tipo_registro, 'count': item.count}
                for item in registros_por_tipo
            ],
            'registros_por_classificacao': [
                {'grupo': item.classificacao_grupo, 'count': item.count}
                for item in registros_por_classificacao
            ],
            'registros_por_obra': registros_por_obra
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@dashboard_bp.route('/atividades-recentes', methods=['GET'])
@token_required
@obra_access_required
def get_atividades_recentes(current_user):
    try:
        limit = request.args.get('limit', 5, type=int)
        obra_id = request.args.get('obra_id', type=int)

        # Query base
        query = db.session.query(Registro).join(
            User, Registro.autor_id == User.id)

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            query = query.filter(Registro.obra_id == current_user.obra_id)
        elif obra_id:
            query = query.filter(Registro.obra_id == obra_id)

        atividades = query.order_by(
            Registro.created_at.desc()).limit(limit).all()

        return jsonify({
            'atividades_recentes': [
                {
                    'id': atividade.id,
                    'titulo': atividade.titulo,
                    'tipo_registro': atividade.tipo_registro,
                    'descricao': atividade.descricao,
                    'autor_id': atividade.autor_id,
                    'autor_nome': atividade.autor.username if atividade.autor else None,
                    'obra_id': atividade.obra_id,
                    'created_at': atividade.created_at.isoformat() if atividade.created_at else None
                }
                for atividade in atividades
            ]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@dashboard_bp.route('/timeline/<int:dias>', methods=['GET'])
@token_required
@obra_access_required
def get_timeline(current_user, dias):
    try:
        obra_id = request.args.get('obra_id', type=int)

        # Calcular data limite
        data_limite = datetime.utcnow() - timedelta(days=dias)

        # Query base
        query = db.session.query(
            func.date(Registro.created_at).label('data'),
            func.count(Registro.id).label('count')
        ).filter(Registro.created_at >= data_limite)

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            query = query.filter(Registro.obra_id == current_user.obra_id)
        elif obra_id:
            query = query.filter(Registro.obra_id == obra_id)

        timeline_data = query.group_by(
            func.date(Registro.created_at)
        ).order_by(func.date(Registro.created_at)).all()

        return jsonify({
            'timeline': [
                {
                    'data': item.data.isoformat() if item.data else None,
                    'count': item.count
                }
                for item in timeline_data
            ]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@dashboard_bp.route('/resumo-mensal', methods=['GET'])
@token_required
@obra_access_required
def get_resumo_mensal(current_user):
    try:
        obra_id = request.args.get('obra_id', type=int)

        # Obter ano atual
        ano_atual = datetime.utcnow().year

        # Query base
        query = db.session.query(
            func.extract('month', Registro.created_at).label('mes'),
            func.count(Registro.id).label('count')
        ).filter(func.extract('year', Registro.created_at) == ano_atual)

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            query = query.filter(Registro.obra_id == current_user.obra_id)
        elif obra_id:
            query = query.filter(Registro.obra_id == obra_id)

        dados_mensais = query.group_by(
            func.extract('month', Registro.created_at)
        ).order_by(func.extract('month', Registro.created_at)).all()

        # Criar lista com todos os meses
        meses = []
        for i in range(1, 13):
            count = 0
            for item in dados_mensais:
                if int(item.mes) == i:
                    count = item.count
                    break

            meses.append({
                'mes': i,
                'nome_mes': calendar.month_name[i],
                'count': count
            })

        return jsonify({
            'resumo_mensal': meses,
            'ano': ano_atual
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
