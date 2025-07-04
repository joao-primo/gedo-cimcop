from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import logging
from ..models.registro import Registro
from ..models.obra import Obra
from ..models.tipo_registro import TipoRegistro
from ..models.user import User
from ..utils.security import audit_log
from sqlalchemy import func, text, desc
from .. import db

dashboard_bp = Blueprint('dashboard', __name__)
logger = logging.getLogger(__name__)


@dashboard_bp.route('/estatisticas', methods=['GET'])
@jwt_required()
def get_estatisticas():
    try:
        current_user_id = get_jwt_identity()

        # Verificar se a tabela registros existe e tem as colunas necessárias
        try:
            # Query defensiva para estatísticas básicas
            total_registros = db.session.query(
                func.count(Registro.id)).scalar() or 0

            # Registros dos últimos 30 dias
            data_limite = datetime.now() - timedelta(days=30)
            registros_30_dias = db.session.query(func.count(Registro.id)).filter(
                Registro.data_registro >= data_limite
            ).scalar() or 0

            # Registros com anexo (verificar se coluna existe)
            try:
                registros_com_anexo = db.session.query(func.count(Registro.id)).filter(
                    Registro.anexos_count > 0
                ).scalar() or 0
            except Exception:
                # Se a coluna anexos_count não existir, usar 0
                registros_com_anexo = 0

            # Média diária
            if total_registros > 0:
                # Calcular dias desde o primeiro registro
                primeiro_registro = db.session.query(
                    func.min(Registro.data_registro)).scalar()
                if primeiro_registro:
                    dias_total = (datetime.now().date() -
                                  primeiro_registro.date()).days + 1
                    media_diaria = round(
                        total_registros / dias_total, 1) if dias_total > 0 else 0
                else:
                    media_diaria = 0
            else:
                media_diaria = 0

            estatisticas = {
                'total_registros': total_registros,
                'registros_ultimos_30_dias': registros_30_dias,
                'registros_com_anexo': registros_com_anexo,
                'media_diaria': media_diaria
            }

            audit_log(current_user_id, 'DASHBOARD_STATS_VIEW',
                      details={'stats': estatisticas})
            return jsonify(estatisticas)

        except Exception as e:
            logger.error(f"Erro ao buscar estatísticas: {str(e)}")
            # Retornar estatísticas zeradas em caso de erro
            return jsonify({
                'total_registros': 0,
                'registros_ultimos_30_dias': 0,
                'registros_com_anexo': 0,
                'media_diaria': 0
            })

    except Exception as e:
        logger.error(f"Erro geral nas estatísticas: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@dashboard_bp.route('/timeline', methods=['GET'])
@jwt_required()
def get_timeline():
    try:
        current_user_id = get_jwt_identity()
        dias = request.args.get('dias', 30, type=int)
        obra_id = request.args.get('obra_id', type=int)

        data_limite = datetime.now() - timedelta(days=dias)

        # Query base
        query = db.session.query(
            func.date(Registro.data_registro).label('data'),
            func.count(Registro.id).label('registros')
        ).filter(
            Registro.data_registro >= data_limite
        )

        # Filtrar por obra se especificado
        if obra_id:
            query = query.filter(Registro.obra_id == obra_id)

        # Agrupar por data
        resultados = query.group_by(func.date(Registro.data_registro)).all()

        # Converter para formato do gráfico
        timeline_data = []
        for resultado in resultados:
            timeline_data.append({
                'data': resultado.data.strftime('%d/%m'),
                'registros': resultado.registros
            })

        # Ordenar por data
        timeline_data.sort(key=lambda x: datetime.strptime(x['data'], '%d/%m'))

        audit_log(current_user_id, 'DASHBOARD_TIMELINE_VIEW',
                  details={'dias': dias, 'obra_id': obra_id})
        return jsonify(timeline_data)

    except Exception as e:
        logger.error(f"Erro ao buscar timeline: {str(e)}")
        return jsonify([])


@dashboard_bp.route('/atividades-recentes', methods=['GET'])
@jwt_required()
def get_atividades_recentes():
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 5, type=int)

        # Query defensiva para atividades recentes
        try:
            query = db.session.query(
                Registro.id,
                Registro.descricao,
                Registro.data_registro,
                Obra.nome.label('obra_nome'),
                TipoRegistro.nome.label('tipo_nome')
            ).join(
                Obra, Registro.obra_id == Obra.id
            ).join(
                TipoRegistro, Registro.tipo_registro_id == TipoRegistro.id
            ).order_by(
                desc(Registro.data_registro)
            ).limit(limit)

            resultados = query.all()

            atividades = []
            for resultado in resultados:
                atividades.append({
                    'id': resultado.id,
                    'descricao': resultado.descricao or 'Sem descrição',
                    'data_registro': resultado.data_registro.isoformat() if resultado.data_registro else None,
                    'obra_nome': resultado.obra_nome or 'Obra não encontrada',
                    'tipo_nome': resultado.tipo_nome or 'Tipo não encontrado'
                })

            audit_log(current_user_id, 'DASHBOARD_ACTIVITIES_VIEW',
                      details={'limit': limit})
            return jsonify(atividades)

        except Exception as e:
            logger.error(f"Erro ao buscar atividades recentes: {str(e)}")
            return jsonify([])

    except Exception as e:
        logger.error(f"Erro geral nas atividades recentes: {str(e)}")
        return jsonify([])


@dashboard_bp.route('/top-tipos-registro', methods=['GET'])
@jwt_required()
def get_top_tipos_registro():
    try:
        current_user_id = get_jwt_identity()

        try:
            # Query para top 10 tipos de registro
            query = db.session.query(
                TipoRegistro.nome,
                func.count(Registro.id).label('total')
            ).join(
                Registro, TipoRegistro.id == Registro.tipo_registro_id
            ).group_by(
                TipoRegistro.id, TipoRegistro.nome
            ).order_by(
                desc(func.count(Registro.id))
            ).limit(10)

            resultados = query.all()

            top_tipos = []
            for resultado in resultados:
                top_tipos.append({
                    'nome': resultado.nome,
                    'total': resultado.total
                })

            audit_log(current_user_id, 'DASHBOARD_TOP_TYPES_VIEW')
            return jsonify(top_tipos)

        except Exception as e:
            logger.error(f"Erro ao buscar top tipos: {str(e)}")
            return jsonify([])

    except Exception as e:
        logger.error(f"Erro geral nos top tipos: {str(e)}")
        return jsonify([])
