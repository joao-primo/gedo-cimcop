from flask import Blueprint, request, jsonify, send_file, redirect, Response
from werkzeug.utils import secure_filename
from models.registro import Registro, db
from models.obra import Obra
from models.tipo_registro import TipoRegistro
from routes.auth import token_required, admin_required, obra_access_required
from services.blob_service import blob_service
from datetime import datetime
import os
import uuid
import requests
import tempfile

registros_bp = Blueprint('registros', __name__)
registros_bp.strict_slashes = False

# Configurações para upload de arquivos - MANTIDO para compatibilidade
UPLOAD_FOLDER = os.path.join(os.path.dirname(
    os.path.dirname(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg',
                      'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def ensure_upload_folder():
    """Garantir que a pasta de uploads existe - MANTIDO para compatibilidade"""
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        print(f"📁 Pasta de uploads criada: {UPLOAD_FOLDER}")


def save_file_legacy(file):
    """MANTIDO: Salva arquivo localmente (sistema antigo)"""
    if file and allowed_file(file.filename):
        ensure_upload_folder()
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        return {
            'caminho_anexo': file_path,
            'nome_arquivo_original': filename,
            'formato_arquivo': filename.rsplit('.', 1)[1].lower(),
            'tamanho_arquivo': os.path.getsize(file_path)
        }
    return None


def save_file_blob(file):
    """NOVO: Salva arquivo no Vercel Blob"""
    if not file or not allowed_file(file.filename):
        return None

    try:
        blob_data = blob_service.upload_file(file)
        if blob_data:
            return {
                'blob_url': blob_data['url'],
                'blob_pathname': blob_data['pathname'],
                'nome_arquivo_original': blob_data['filename'],
                'formato_arquivo': blob_data['filename'].rsplit('.', 1)[1].lower() if '.' in blob_data['filename'] else None,
                'tamanho_arquivo': blob_data['size']
            }
    except Exception as e:
        print(f"❌ Erro no upload para Blob: {str(e)}")

    return None


def save_file(file):
    """Função principal: tenta Blob primeiro, fallback para local"""
    if not file or not allowed_file(file.filename):
        return None

    # Tentar Vercel Blob primeiro
    blob_result = save_file_blob(file)
    if blob_result:
        print(f"✅ Arquivo salvo no Vercel Blob: {blob_result['blob_url']}")
        return blob_result

    # Fallback para sistema local
    print("⚠️ Fallback para sistema local")
    return save_file_legacy(file)


def validate_registro_data(data, files):
    """Valida dados do registro"""
    errors = []
    required_fields = ['titulo', 'tipo_registro',
                       'descricao', 'tipo_registro_id', 'data_registro']
    for field in required_fields:
        if not data.get(field):
            errors.append(f'Campo {field} é obrigatório')

    if 'anexo' in files and files['anexo'].filename != '':
        file = files['anexo']
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)

        if size > 16 * 1024 * 1024:
            errors.append('Arquivo muito grande (máximo 16MB)')
        if not allowed_file(file.filename):
            errors.append('Tipo de arquivo não permitido')

    return errors


# ← NOVO: Endpoint de debug
@registros_bp.route('/<int:registro_id>/debug', methods=['GET'])
@token_required
def debug_registro(current_user, registro_id):
    """Debug de registro para troubleshooting"""
    try:
        print(f"🔍 DEBUG: Buscando registro ID {registro_id}")

        registro = Registro.query.get(registro_id)
        if not registro:
            print(f"❌ DEBUG: Registro {registro_id} não encontrado")
            return jsonify({
                'message': f'Registro {registro_id} não encontrado',
                'exists': False
            }), 404

        print(f"✅ DEBUG: Registro {registro_id} encontrado")
        print(f"   - Título: {registro.titulo}")
        print(f"   - Tem blob_url: {bool(registro.blob_url)}")
        print(f"   - Tem caminho_anexo: {bool(registro.caminho_anexo)}")
        print(f"   - Blob URL: {registro.blob_url}")
        print(f"   - Caminho anexo: {registro.caminho_anexo}")

        return jsonify({
            'message': 'Registro encontrado',
            'exists': True,
            'registro': {
                'id': registro.id,
                'titulo': registro.titulo,
                'tem_blob_url': bool(registro.blob_url),
                'tem_caminho_anexo': bool(registro.caminho_anexo),
                'blob_url': registro.blob_url,
                'caminho_anexo': registro.caminho_anexo,
                'nome_arquivo_original': registro.nome_arquivo_original,
                'tem_anexo': bool(registro.blob_url or registro.caminho_anexo)
            }
        }), 200

    except Exception as e:
        print(f"❌ DEBUG: Erro ao buscar registro {registro_id}: {str(e)}")
        return jsonify({
            'message': f'Erro interno: {str(e)}',
            'exists': False
        }), 500


@registros_bp.route('/<int:registro_id>/download', methods=['GET'])
@token_required
@obra_access_required
def download_anexo(current_user, registro_id):
    try:
        print(f"🔽 DOWNLOAD: Iniciando download do registro {registro_id}")
        print(f"   - Usuário: {current_user.username} (ID: {current_user.id})")

        registro = Registro.query.get(registro_id)
        if not registro:
            print(f"❌ DOWNLOAD: Registro {registro_id} não encontrado")
            return jsonify({'message': 'Registro não encontrado'}), 404

        print(f"✅ DOWNLOAD: Registro {registro_id} encontrado")
        print(f"   - Título: {registro.titulo}")
        print(f"   - Obra ID: {registro.obra_id}")
        print(f"   - Usuário obra ID: {current_user.obra_id}")

        # Verificar permissões
        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            print(
                f"❌ DOWNLOAD: Acesso negado - usuário obra {current_user.obra_id} != registro obra {registro.obra_id}")
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        print(f"✅ DOWNLOAD: Permissões OK")
        print(f"   - Tem blob_url: {bool(registro.blob_url)}")
        print(f"   - Tem caminho_anexo: {bool(registro.caminho_anexo)}")

        # ATUALIZADO: Fazer proxy do Vercel Blob
        if registro.blob_url:
            try:
                print(f"🔗 DOWNLOAD: Fazendo proxy do Vercel Blob")
                print(f"   - URL: {registro.blob_url}")

                # Fazer download do Vercel Blob
                print("📡 DOWNLOAD: Fazendo requisição para Vercel Blob...")
                response = requests.get(
                    registro.blob_url, stream=True, timeout=30)
                response.raise_for_status()

                print(
                    f"✅ DOWNLOAD: Resposta do Vercel Blob: {response.status_code}")
                print(
                    f"   - Content-Type: {response.headers.get('content-type')}")
                print(
                    f"   - Content-Length: {response.headers.get('content-length')}")

                # Determinar tipo de conteúdo
                content_type = response.headers.get(
                    'content-type', 'application/octet-stream')

                # Determinar nome do arquivo
                filename = registro.nome_arquivo_original or f'anexo_{registro_id}'
                print(f"📎 DOWNLOAD: Nome do arquivo: {filename}")

                # Criar resposta streaming
                def generate():
                    try:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                yield chunk
                    except Exception as e:
                        print(f"❌ DOWNLOAD: Erro no streaming: {str(e)}")
                        raise

                print("🚀 DOWNLOAD: Iniciando streaming do arquivo...")

                # Retornar arquivo como stream
                return Response(
                    generate(),
                    headers={
                        'Content-Type': content_type,
                        'Content-Disposition': f'attachment; filename="{filename}"',
                        'Content-Length': response.headers.get('content-length', ''),
                        'Cache-Control': 'no-cache'
                    }
                )

            except requests.RequestException as e:
                print(f"❌ DOWNLOAD: Erro ao baixar do Vercel Blob: {str(e)}")
                return jsonify({'message': f'Erro ao acessar arquivo no storage: {str(e)}'}), 500
            except Exception as e:
                print(f"❌ DOWNLOAD: Erro geral no Blob: {str(e)}")
                return jsonify({'message': f'Erro interno no download: {str(e)}'}), 500

        # Fallback para sistema antigo
        if not registro.caminho_anexo:
            print("❌ DOWNLOAD: Registro não possui anexo")
            return jsonify({'message': 'Este registro não possui anexo'}), 404

        print(f"📁 DOWNLOAD: Usando sistema local: {registro.caminho_anexo}")
        if not os.path.exists(registro.caminho_anexo):
            print(
                f"❌ DOWNLOAD: Arquivo local não encontrado: {registro.caminho_anexo}")
            return jsonify({'message': 'Arquivo não encontrado no servidor'}), 404

        print("✅ DOWNLOAD: Enviando arquivo local")
        return send_file(
            registro.caminho_anexo,
            as_attachment=True,
            download_name=registro.nome_arquivo_original or 'anexo',
            mimetype='application/octet-stream'
        )

    except Exception as e:
        print(f"❌ DOWNLOAD: Erro geral: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@registros_bp.route('/', methods=['GET'])
@token_required
@obra_access_required
def list_registros(current_user):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        obra_id = request.args.get('obra_id', type=int)
        tipo_registro = request.args.get('tipo_registro')
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')

        query = Registro.query

        if current_user.role == 'usuario_padrao':
            query = query.filter_by(obra_id=current_user.obra_id)
        elif obra_id:
            query = query.filter_by(obra_id=obra_id)

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

        query = query.order_by(Registro.created_at.desc())
        registros_paginados = query.paginate(
            page=page, per_page=per_page, error_out=False)

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

        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        return jsonify({'registro': registro.to_dict()}), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@registros_bp.route('/', methods=['POST'])
@token_required
@obra_access_required
def create_registro(current_user):
    try:
        validation_errors = validate_registro_data(request.form, request.files)
        if validation_errors:
            return jsonify({'message': '; '.join(validation_errors)}), 400

        titulo = request.form.get('titulo')
        tipo_registro = request.form.get('tipo_registro')
        descricao = request.form.get('descricao')
        codigo_numero = request.form.get('codigo_numero')
        data_registro = request.form.get('data_registro')
        obra_id = request.form.get('obra_id', type=int)
        tipo_registro_id = request.form.get('tipo_registro_id', type=int)

        if current_user.role == 'usuario_padrao':
            obra_id = current_user.obra_id
        elif not obra_id:
            return jsonify({'message': 'Obra é obrigatória'}), 400

        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        if obra.status.lower() == 'suspensa':
            return jsonify({'message': 'A obra está suspensa e não pode receber novos registros.'}), 403

        if current_user.role == 'usuario_padrao' and obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a esta obra'}), 403

        data_registro_dt = datetime.utcnow()
        if data_registro:
            try:
                data_registro_dt = datetime.strptime(data_registro, '%Y-%m-%d')
            except ValueError:
                return jsonify({'message': 'Formato de data_registro inválido (use YYYY-MM-DD)'}), 400

        # ATUALIZADO: Usar nova função de upload
        file_info = {}
        if 'anexo' in request.files:
            file = request.files['anexo']
            if file.filename != '':
                file_data = save_file(file)
                if file_data:
                    file_info = file_data
                    print(f"✅ Arquivo processado: {file_data}")
                else:
                    return jsonify({'message': 'Formato de arquivo não permitido'}), 400

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

        print(f"✅ Registro criado: ID {registro.id}")
        print(f"   - Tem blob_url: {bool(registro.blob_url)}")
        print(f"   - Tem caminho_anexo: {bool(registro.caminho_anexo)}")

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

        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        if current_user.role != 'administrador' and registro.autor_id != current_user.id:
            return jsonify({'message': 'Apenas o autor ou administrador pode editar este registro'}), 403

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

        # ATUALIZADO: Processar novo arquivo
        if 'anexo' in request.files:
            file = request.files['anexo']
            if file.filename != '':
                # Deletar arquivo anterior
                if registro.blob_pathname:
                    blob_service.delete_file(registro.blob_pathname)
                elif registro.caminho_anexo and os.path.exists(registro.caminho_anexo):
                    os.remove(registro.caminho_anexo)

                file_data = save_file(file)
                if file_data:
                    # Limpar campos antigos
                    registro.caminho_anexo = file_data.get('caminho_anexo')
                    registro.blob_url = file_data.get('blob_url')
                    registro.blob_pathname = file_data.get('blob_pathname')
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

        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        if current_user.role != 'administrador' and registro.autor_id != current_user.id:
            return jsonify({'message': 'Apenas o autor ou administrador pode deletar este registro'}), 403

        # ATUALIZADO: Deletar arquivo do Blob ou local
        if registro.blob_pathname:
            blob_service.delete_file(registro.blob_pathname)
        elif registro.caminho_anexo and os.path.exists(registro.caminho_anexo):
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
        if current_user.role == 'usuario_padrao' and current_user.obra_id != obra_id:
            return jsonify({'message': 'Acesso negado a esta obra'}), 403

        obra = Obra.query.get(obra_id)
        if not obra:
            return jsonify({'message': 'Obra não encontrada'}), 404

        if obra.status.lower() == 'suspensa':
            return jsonify({'message': 'A obra está suspensa e não pode receber novos registros.'}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

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
