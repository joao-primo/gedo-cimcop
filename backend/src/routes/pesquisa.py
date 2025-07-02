from flask import Blueprint, request, jsonify
from models.registro import Registro, db
from models.obra import Obra
from models.tipo_registro import TipoRegistro
from routes.auth import token_required, obra_access_required
from sqlalchemy import or_, and_, func
from datetime import datetime

pesquisa_bp = Blueprint('pesquisa', __name__)


@pesquisa_bp.route('/', methods=['GET'])
@token_required
@obra_access_required
def pesquisa_avancada(current_user):
    try:
        # Parâmetros de busca
        palavra_chave = request.args.get('palavra_chave', '').strip()
        obra_id = request.args.get('obra_id', type=int)
        tipo_registro = request.args.get('tipo_registro', '').strip()
        tipo_registro_id = request.args.get('tipo_registro_id', type=int)
        codigo_numero = request.args.get('codigo_numero', '').strip()
        autor_id = request.args.get('autor_id', type=int)
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        data_registro_inicio = request.args.get('data_registro_inicio')
        data_registro_fim = request.args.get('data_registro_fim')

        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Query base
        query = Registro.query

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            query = query.filter_by(obra_id=current_user.obra_id)
        elif obra_id:
            query = query.filter_by(obra_id=obra_id)

        # Filtro por palavra-chave (busca em título e descrição)
        if palavra_chave:
            query = query.filter(
                or_(
                    Registro.titulo.ilike(f'%{palavra_chave}%'),
                    Registro.descricao.ilike(f'%{palavra_chave}%')
                )
            )

        # Filtro por tipo de registro
        if tipo_registro:
            query = query.filter_by(tipo_registro=tipo_registro)

        if tipo_registro_id:
            query = query.filter_by(tipo_registro_id=tipo_registro_id)

        # Filtro por código/número
        if codigo_numero:
            query = query.filter(
                Registro.codigo_numero.ilike(f'%{codigo_numero}%'))

        # Filtro por autor
        if autor_id:
            query = query.filter_by(autor_id=autor_id)

        # Filtros por data de criação
        if data_inicio:
            try:
                data_inicio_dt = datetime.strptime(data_inicio, '%Y-%m-%d')
                query = query.filter(Registro.created_at >= data_inicio_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_inicio inválido (use YYYY-MM-DD)'}), 400

        if data_fim:
            try:
                data_fim_dt = datetime.strptime(data_fim, '%Y-%m-%d')
                # Adicionar 1 dia para incluir todo o dia final
                data_fim_dt = data_fim_dt.replace(
                    hour=23, minute=59, second=59)
                query = query.filter(Registro.created_at <= data_fim_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_fim inválido (use YYYY-MM-DD)'}), 400

        # Filtros por data do registro
        if data_registro_inicio:
            try:
                data_registro_inicio_dt = datetime.strptime(
                    data_registro_inicio, '%Y-%m-%d')
                data_registro_fim_dt = data_registro_inicio_dt.replace(
                    hour=23, minute=59, second=59)
                query = query.filter(
                    Registro.data_registro >= data_registro_inicio_dt,
                    Registro.data_registro <= data_registro_fim_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_registro_inicio inválido (use YYYY-MM-DD)'}), 400

        if data_registro_fim:
            try:
                data_registro_fim_dt = datetime.strptime(
                    data_registro_fim, '%Y-%m-%d')
                data_registro_fim_dt = data_registro_fim_dt.replace(
                    hour=23, minute=59, second=59)
                query = query.filter(
                    Registro.data_registro <= data_registro_fim_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_registro_fim inválido (use YYYY-MM-DD)'}), 400

        # Ordenação
        ordenacao = request.args.get('ordenacao', 'data_desc')
        if ordenacao == 'data_asc':
            query = query.order_by(Registro.created_at.asc())
        elif ordenacao == 'data_desc':
            query = query.order_by(Registro.created_at.desc())
        elif ordenacao == 'titulo_asc':
            query = query.order_by(Registro.titulo.asc())
        elif ordenacao == 'titulo_desc':
            query = query.order_by(Registro.titulo.desc())
        elif ordenacao == 'data_registro_asc':
            query = query.order_by(Registro.data_registro.asc())
        elif ordenacao == 'data_registro_desc':
            query = query.order_by(Registro.data_registro.desc())
        else:
            query = query.order_by(Registro.created_at.desc())

        # Paginação
        registros_paginados = query.paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'registros': [registro.to_dict() for registro in registros_paginados.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': registros_paginados.total,
                'pages': registros_paginados.pages,
                'has_next': registros_paginados.has_next,
                'has_prev': registros_paginados.has_prev
            },
            'filtros_aplicados': {
                'palavra_chave': palavra_chave,
                'obra_id': obra_id,
                'tipo_registro': tipo_registro,
                'tipo_registro_id': tipo_registro_id,
                'codigo_numero': codigo_numero,
                'autor_id': autor_id,
                'data_inicio': data_inicio,
                'data_fim': data_fim,
                'data_registro_inicio': data_registro_inicio,
                'data_registro_fim': data_registro_fim,
                'ordenacao': ordenacao
            }
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@pesquisa_bp.route('/filtros', methods=['GET'])
@token_required
@obra_access_required
def get_filtros_disponiveis(current_user):
    try:
        # Obras disponíveis
        obras = []
        if current_user.role == 'administrador':
            obras = Obra.query.all()
        else:
            obra = Obra.query.get(current_user.obra_id)
            if obra:
                obras = [obra]

        # Tipos de registro disponíveis
        tipos_registro = TipoRegistro.query.filter_by(ativo=True).all()

        # Tipos de registro únicos nos registros existentes
        query = db.session.query(Registro.tipo_registro).distinct()
        if current_user.role == 'usuario_padrao':
            query = query.filter_by(obra_id=current_user.obra_id)

        tipos_registro_existentes = [tipo[0]
                                     for tipo in query.all() if tipo[0]]

        # Autores (usuários que criaram registros)
        from models.user import User
        autores_query = db.session.query(User.id, User.username, User.email)\
            .join(Registro, User.id == Registro.autor_id).distinct()

        if current_user.role == 'usuario_padrao':
            autores_query = autores_query.filter(
                Registro.obra_id == current_user.obra_id)

        autores = autores_query.all()

        # Faixas de data disponíveis
        data_query = db.session.query(
            func.min(Registro.created_at).label('data_min'),
            func.max(Registro.created_at).label('data_max'),
            func.min(Registro.data_registro).label('data_registro_min'),
            func.max(Registro.data_registro).label('data_registro_max')
        )

        if current_user.role == 'usuario_padrao':
            data_query = data_query.filter_by(obra_id=current_user.obra_id)

        datas = data_query.first()

        return jsonify({
            'obras': [obra.to_dict() for obra in obras],
            'tipos_registro': [tipo.to_dict() for tipo in tipos_registro],
            'tipos_registro_existentes': tipos_registro_existentes,
            'autores': [
                {'id': autor_id, 'username': username, 'email': email}
                for autor_id, username, email in autores
            ],
            'faixas_data': {
                'criacao_min': datas.data_min.isoformat() if datas.data_min else None,
                'criacao_max': datas.data_max.isoformat() if datas.data_max else None,
                'registro_min': datas.data_registro_min.isoformat() if datas.data_registro_min else None,
                'registro_max': datas.data_registro_max.isoformat() if datas.data_registro_max else None
            },
            'opcoes_ordenacao': [
                {'value': 'data_desc',
                    'label': 'Data de Criação (Mais Recente)'},
                {'value': 'data_asc',
                    'label': 'Data de Criação (Mais Antiga)'},
                {'value': 'data_registro_desc',
                    'label': 'Data do Registro (Mais Recente)'},
                {'value': 'data_registro_asc',
                    'label': 'Data do Registro (Mais Antiga)'},
                {'value': 'titulo_asc', 'label': 'Título (A-Z)'},
                {'value': 'titulo_desc', 'label': 'Título (Z-A)'}
            ]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@pesquisa_bp.route('/exportar', methods=['POST'])
@token_required
@obra_access_required
def exportar_resultados(current_user):
    try:
        # Receber os mesmos filtros da pesquisa
        data = request.get_json()

        # Aplicar os mesmos filtros da pesquisa avançada
        # (código similar ao endpoint de pesquisa, mas sem paginação)

        # Por enquanto, retornar apenas uma mensagem de sucesso
        # A implementação completa incluiria geração de CSV/Excel

        return jsonify({
            'message': 'Funcionalidade de exportação será implementada em versão futura',
            'filtros_recebidos': data
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
