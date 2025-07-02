from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from models.registro import Registro, db
from models.obra import Obra
from models.tipo_registro import TipoRegistro
from routes.auth import token_required, admin_required, obra_access_required
from datetime import datetime
import os
import uuid

registros_bp = Blueprint('registros', __name__)
registros_bp.strict_slashes = False

# Configurações para upload de arquivos
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg',
                      'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_file(file):
    """Salva o arquivo e retorna as informações"""
    if file and allowed_file(file.filename):
        # Criar diretório de upload se não existir
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        # Gerar nome único para o arquivo
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)

        # Salvar arquivo
        file.save(file_path)

        return {
            'caminho_anexo': file_path,
            'nome_arquivo_original': filename,
            'formato_arquivo': filename.rsplit('.', 1)[1].lower(),
            'tamanho_arquivo': os.path.getsize(file_path)
        }
    return None


# Adicionar função de validação no início do arquivo
def validate_registro_data(data, files):
    """Valida dados do registro"""
    errors = []

    # Validações obrigatórias
    required_fields = ['titulo', 'tipo_registro', 'descricao', 'tipo_registro_id', 'data_registro']
    for field in required_fields:
        if not data.get(field):
            errors.append(f'Campo {field} é obrigatório')

    # Validar arquivo apenas se fornecido
    if 'anexo' in files and files['anexo'].filename != '':
        file = files['anexo']
        # Validar tamanho (16MB max)
        file.seek(0, 2)  # Vai para o final
        size = file.tell()
        file.seek(0)  # Volta para o início
        
        if size > 16 * 1024 * 1024:
            errors.append('Arquivo muito grande (máximo 16MB)')

        # Validar extensão
        if not allowed_file(file.filename):
            errors.append('Tipo de arquivo não permitido')

    return errors


# NOVO ENDPOINT PARA DOWNLOAD DE ARQUIVOS
@registros_bp.route('/<int:registro_id>/download', methods=['GET'])
@token_required
@obra_access_required
def download_anexo(current_user, registro_id):
    try:
        registro = Registro.query.get(registro_id)
        if not registro:
            return jsonify({'message': 'Registro não encontrado'}), 404

        # Verificar se o usuário tem acesso a este registro
        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        # Verificar se existe anexo
        if not registro.caminho_anexo:
            return jsonify({'message': 'Este registro não possui anexo'}), 404

        # Verificar se o arquivo existe no sistema
        if not os.path.exists(registro.caminho_anexo):
            return jsonify({'message': 'Arquivo não encontrado no servidor'}), 404

        # Retornar o arquivo para download
        return send_file(
            registro.caminho_anexo,
            as_attachment=True,
            download_name=registro.nome_arquivo_original or 'anexo',
            mimetype='application/octet-stream'
        )

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@registros_bp.route('/', methods=['GET'])
@token_required
@obra_access_required
def list_registros(current_user):
    try:
        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Filtros
        obra_id = request.args.get('obra_id', type=int)
        tipo_registro = request.args.get('tipo_registro')
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')

        # Query base
        query = Registro.query

        # Aplicar filtros de acesso baseado no usuário
        if current_user.role == 'usuario_padrao':
            query = query.filter_by(obra_id=current_user.obra_id)
        elif obra_id:
            query = query.filter_by(obra_id=obra_id)

        # Aplicar outros filtros
        if tipo_registro:
            query = query.filter_by(tipo_registro=tipo_registro)

        if data_inicio:
            try:
                data_inicio_dt = datetime.strptime(data_inicio, '%Y-%m-%d')
                query = query.filter(Registro.data_registro >= data_inicio_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_inicio inválido (use YYYY-MM-DD)'}), 400

        if data_fim:
            try:
                data_fim_dt = datetime.strptime(data_fim, '%Y-%m-%d')
                query = query.filter(Registro.data_registro <= data_fim_dt)
            except ValueError:
                return jsonify({'message': 'Formato de data_fim inválido (use YYYY-MM-DD)'}), 400

        # Ordenar por data de criação (mais recente primeiro)
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
            }
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@registros_bp.route('/<int:registro_id>', methods=['GET'])
@token_required
@obra_access_required
def get_registro(current_user, registro_id):
    try:
        registro = Registro.query.get(registro_id)
        if not registro:
            return jsonify({'message': 'Registro não encontrado'}), 404

        # Verificar se o usuário tem acesso a este registro
        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        return jsonify({
            'registro': registro.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@registros_bp.route('/', methods=['POST'])
@token_required
@obra_access_required
def create_registro(current_user):
    try:
        # Validar dados
        validation_errors = validate_registro_data(request.form, request.files)
        if validation_errors:
            return jsonify({'message': '; '.join(validation_errors)}), 400

        # Obter dados do formulário
        titulo = request.form.get('titulo')
        tipo_registro = request.form.get('tipo_registro')
        descricao = request.form.get('descricao')
        codigo_numero = request.form.get('codigo_numero')
        data_registro = request.form.get('data_registro')
        obra_id = request.form.get('obra_id', type=int)
        tipo_registro_id = request.form.get('tipo_registro_id', type=int)

       # Validações obrigatórias
        # if not all([titulo, tipo_registro, descricao, tipo_registro_id, data_registro]):
        #    return jsonify({'message': 'Todos os campos obrigatórios devem ser preenchidos'}), 400

        # if 'anexo' not in request.files or request.files['anexo'].filename == '':
        #    return jsonify({'message': 'O anexo é obrigatório'}), 400

        # Determinar obra_id
        if current_user.role == 'usuario_padrao':
            obra_id = current_user.obra_id
        elif not obra_id:
            return jsonify({'message': 'Obra é obrigatória'}), 400

        # Verificar se a obra existe
        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        # Bloqueio: impedir criação se obra estiver suspensa
        if obra.status.lower() == 'suspensa':
            return jsonify({'message': 'A obra está suspensa e não pode receber novos registros.'}), 403
        # Verificar se o usuário tem acesso a esta obra
        if current_user.role == 'usuario_padrao' and obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a esta obra'}), 403

        # Processar data do registro
        data_registro_dt = datetime.utcnow()
        if data_registro:
            try:
                data_registro_dt = datetime.strptime(data_registro, '%Y-%m-%d')
            except ValueError:
                return jsonify({'message': 'Formato de data_registro inválido (use YYYY-MM-DD)'}), 400

        # Processar arquivo anexo se fornecido
        file_info = {}
        if 'anexo' in request.files:
            file = request.files['anexo']
            if file.filename != '':
                file_data = save_file(file)
                if file_data:
                    file_info = file_data
                else:
                    return jsonify({'message': 'Formato de arquivo não permitido'}), 400

        # Criar registro
        registro = Registro(
            titulo=titulo,
            tipo_registro=tipo_registro,
            descricao=descricao,
            autor_id=current_user.id,
            obra_id=obra_id,
            data_registro=data_registro_dt,
            codigo_numero=codigo_numero,
            tipo_registro_id=tipo_registro_id,
            **file_info
        )

        db.session.add(registro)
        db.session.commit()

        # TODO: Disparar workflow padrão aqui
        # trigger_workflow(registro)

        # Processar workflows de notificação
        try:
            from services.email_service import processar_workflow_registro
            processar_workflow_registro(registro, 'criacao')
        except Exception as e:
            print(f"Erro ao processar workflows: {e}")

        return jsonify({
            'message': 'Registro criado com sucesso',
            'registro': registro.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@registros_bp.route('/<int:registro_id>', methods=['PUT'])
@token_required
@obra_access_required
def update_registro(current_user, registro_id):
    try:
        registro = Registro.query.get(registro_id)
        if not registro:
            return jsonify({'message': 'Registro não encontrado'}), 404

        # Verificar se o usuário tem acesso a este registro
        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        # Verificar se o usuário é o autor ou é admin
        if current_user.role != 'administrador' and registro.autor_id != current_user.id:
            return jsonify({'message': 'Apenas o autor ou administrador pode editar este registro'}), 403

        # Obter dados do formulário
        if 'titulo' in request.form:
            registro.titulo = request.form['titulo']

        if 'tipo_registro' in request.form:
            registro.tipo_registro = request.form['tipo_registro']

        if 'descricao' in request.form:
            registro.descricao = request.form['descricao']

        if 'codigo_numero' in request.form:
            registro.codigo_numero = request.form['codigo_numero']

        if 'data_registro' in request.form:
            try:
                registro.data_registro = datetime.strptime(
                    request.form['data_registro'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'message': 'Formato de data_registro inválido (use YYYY-MM-DD)'}), 400

        if 'tipo_registro_id' in request.form:
            registro.tipo_registro_id = request.form.get(
                'tipo_registro_id', type=int)

        # Processar novo arquivo anexo se fornecido
        if 'anexo' in request.files:
            file = request.files['anexo']
            if file.filename != '':
                # Remover arquivo anterior se existir
                if registro.caminho_anexo and os.path.exists(registro.caminho_anexo):
                    os.remove(registro.caminho_anexo)

                file_data = save_file(file)
                if file_data:
                    registro.caminho_anexo = file_data['caminho_anexo']
                    registro.nome_arquivo_original = file_data['nome_arquivo_original']
                    registro.formato_arquivo = file_data['formato_arquivo']
                    registro.tamanho_arquivo = file_data['tamanho_arquivo']
                else:
                    return jsonify({'message': 'Formato de arquivo não permitido'}), 400

        db.session.commit()

        return jsonify({
            'message': 'Registro atualizado com sucesso',
            'registro': registro.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@registros_bp.route('/<int:registro_id>', methods=['DELETE'])
@token_required
@obra_access_required
def delete_registro(current_user, registro_id):
    try:
        registro = Registro.query.get(registro_id)
        if not registro:
            return jsonify({'message': 'Registro não encontrado'}), 404

        # Verificar se o usuário tem acesso a este registro
        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        # Verificar se o usuário é o autor ou é admin
        if current_user.role != 'administrador' and registro.autor_id != current_user.id:
            return jsonify({'message': 'Apenas o autor ou administrador pode deletar este registro'}), 403

        # Remover arquivo anexo se existir
        if registro.caminho_anexo and os.path.exists(registro.caminho_anexo):
            os.remove(registro.caminho_anexo)

        db.session.delete(registro)
        db.session.commit()

        return jsonify({'message': 'Registro deletado com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@registros_bp.route('/obra/<int:obra_id>', methods=['GET'])
@token_required
@obra_access_required
def list_registros_por_obra(current_user, obra_id):
    try:
        # Verificar se o usuário tem acesso a esta obra
        if current_user.role == 'usuario_padrao' and current_user.obra_id != obra_id:
            return jsonify({'message': 'Acesso negado a esta obra'}), 403

        # Verificar se a obra existe
        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        # Bloqueio: impedir criação se obra estiver suspensa
        if obra.status.lower() == 'suspensa':
            return jsonify({'message': 'A obra está suspensa e não pode receber novos registros.'}), 403
        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Buscar registros da obra
        registros_paginados = Registro.query.filter_by(obra_id=obra_id)\
            .order_by(Registro.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'obra': obra.to_dict(),
            'registros': [registro.to_dict() for registro in registros_paginados.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': registros_paginados.total,
                'pages': registros_paginados.pages,
                'has_next': registros_paginados.has_next,
                'has_prev': registros_paginados.has_prev
            }
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
