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
import mimetypes
import magic
from flask_limiter.util import get_remote_address
from flask_limiter import Limiter
import bleach
import logging
import hashlib
from PIL import Image
import PyPDF2
from extensions import limiter

registros_bp = Blueprint('registros', __name__)
registros_bp.strict_slashes = False

# Configurações para upload de arquivos - MANTIDO para compatibilidade
UPLOAD_FOLDER = os.path.join(os.path.dirname(
    os.path.dirname(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg',
                      'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}
ALLOWED_MIMETYPES = {
    'text/plain', 'application/pdf', 'image/png', 'image/jpeg', 'image/gif',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

logger = logging.getLogger("gedo.registros")

def validate_file_magic_bytes(file):
    """Valida arquivo usando magic bytes"""
    try:
        file.seek(0)
        header = file.read(1024)
        file.seek(0)
        
        # Detectar tipo real do arquivo
        file_type = magic.from_buffer(header, mime=True)
        
        # Mapeamento de tipos permitidos
        allowed_magic_types = {
            'application/pdf': ['pdf'],
            'image/jpeg': ['jpg', 'jpeg'],
            'image/png': ['png'],
            'image/gif': ['gif'],
            'text/plain': ['txt'],
            'application/msword': ['doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
            'application/vnd.ms-excel': ['xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx']
        }
        
        return file_type, file_type in allowed_magic_types
    except Exception as e:
        logger.error(f"Erro na validação magic bytes: {str(e)}")
        return None, False

def validate_file_content(file, file_type):
    """Valida conteúdo específico do arquivo"""
    try:
        file.seek(0)
        
        if file_type == 'application/pdf':
            # Validar PDF
            try:
                pdf_reader = PyPDF2.PdfReader(file)
                # Verificar se tem pelo menos uma página
                if len(pdf_reader.pages) == 0:
                    return False
                # Verificar se não está corrompido
                for page in pdf_reader.pages[:3]:  # Verificar primeiras 3 páginas
                    page.extract_text()
                return True
            except Exception:
                return False
                
        elif file_type.startswith('image/'):
            # Validar imagem
            try:
                with Image.open(file) as img:
                    img.verify()  # Verificar integridade
                    # Verificar dimensões razoáveis
                    if img.size[0] > 10000 or img.size[1] > 10000:
                        return False
                return True
            except Exception:
                return False
                
        elif file_type == 'text/plain':
            # Validar texto
            try:
                content = file.read().decode('utf-8')
                # Verificar se não contém caracteres suspeitos
                suspicious_patterns = ['<script', '<?php', '<%', 'javascript:', 'vbscript:']
                content_lower = content.lower()
                for pattern in suspicious_patterns:
                    if pattern in content_lower:
                        return False
                return True
            except Exception:
                return False
        
        # Para outros tipos, validação básica
        return True
        
    except Exception as e:
        logger.error(f"Erro na validação de conteúdo: {str(e)}")
        return False
    finally:
        file.seek(0)

def calculate_file_hash(file):
    """Calcula hash SHA-256 do arquivo"""
    try:
        file.seek(0)
        hash_sha256 = hashlib.sha256()
        for chunk in iter(lambda: file.read(4096), b""):
            hash_sha256.update(chunk)
        file.seek(0)
        return hash_sha256.hexdigest()
    except Exception as e:
        logger.error(f"Erro no cálculo de hash: {str(e)}")
        return None

def secure_filename_advanced(filename):
    """Sanitização avançada de nome de arquivo"""
    if not filename:
        return "arquivo_sem_nome"
    
    # Remover path traversal
    filename = os.path.basename(filename)
    
    # Remover caracteres perigosos
    import re
    filename = re.sub(r'[^\w\s.-]', '', filename)
    filename = re.sub(r'[-\s]+', '_', filename)
    
    # Limitar tamanho
    if len(filename) > 100:
        name, ext = os.path.splitext(filename)
        filename = name[:95] + ext
    
    # Garantir que não seja vazio
    if not filename or filename in ['.', '..']:
        filename = f"arquivo_{uuid.uuid4().hex[:8]}"
    
    return filename.strip('._-')

def allowed_file(filename, mimetype=None):
    """Validação básica mantida para compatibilidade"""
    if not filename:
        return False
    
    # Validação por extensão (mantida)
    ext_ok = '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    
    if mimetype:
        mime_ok = mimetype in ALLOWED_MIMETYPES
        return ext_ok and mime_ok
    
    return ext_ok

def validate_file_security(file):
    """Validação de segurança completa do arquivo"""
    if not file or not file.filename:
        raise ValueError('Arquivo não fornecido')
    
    # 1. Validação básica
    if not allowed_file(file.filename, file.mimetype):
        raise ValueError('Tipo de arquivo não permitido')
    
    # 2. Verificar tamanho
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise ValueError(f'Arquivo muito grande (máximo {MAX_FILE_SIZE/1024/1024:.1f}MB)')
    
    if size == 0:
        raise ValueError('Arquivo vazio')
    
    # 3. Validação por magic bytes
    detected_type, is_valid_type = validate_file_magic_bytes(file)
    if not is_valid_type:
        raise ValueError(f'Tipo de arquivo não permitido: {detected_type}')
    
    # 4. Validação de conteúdo
    if not validate_file_content(file, detected_type):
        raise ValueError('Conteúdo do arquivo inválido ou corrompido')
    
    # 5. Calcular hash para integridade
    file_hash = calculate_file_hash(file)
    
    # 6. Sanitizar nome do arquivo
    safe_filename = secure_filename_advanced(file.filename)
    
    return {
        'is_valid': True,
        'detected_type': detected_type,
        'file_hash': file_hash,
        'safe_filename': safe_filename,
        'original_filename': file.filename,
        'file_size': size
    }


def ensure_upload_folder():
    """Garantir que a pasta de uploads existe - MANTIDO para compatibilidade"""
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        logger.info(f"📁 Pasta de uploads criada: {UPLOAD_FOLDER}")


def save_file_legacy(file):
    """MANTIDO: Salva arquivo localmente (sistema antigo)"""
    if file and allowed_file(file.filename, file.mimetype):
        ensure_upload_folder()
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        if size > MAX_FILE_SIZE:
            raise ValueError('Arquivo muito grande (máximo 16MB)')
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
    if not file or not allowed_file(file.filename, file.mimetype):
        return None
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        raise ValueError('Arquivo muito grande (máximo 16MB)')
    try:
        blob_data = blob_service.upload_file(file)
        if blob_data:
            return {
                'blob_url': blob_data['url'],
                'blob_pathname': blob_data['pathname'],
                'nome_arquivo_original': secure_filename(blob_data['filename']),
                'formato_arquivo': blob_data.get('file_extension', blob_data['filename'].rsplit('.', 1)[1].lower() if '.' in blob_data['filename'] else None),
                'tamanho_arquivo': blob_data['size']
            }
    except Exception as e:
        logger.error(f"❌ Erro no upload para Blob: {str(e)}")
    return None


def save_file(file):
    """Função principal: validação segura + salvamento"""
    if not file or not file.filename or file.filename.strip() == '':
        return None
    
    try:
        # Validação de segurança completa
        validation_result = validate_file_security(file)
        
        logger.info(f"✅ Arquivo validado com segurança: {validation_result['safe_filename']}")
        logger.info(f"   - Tipo detectado: {validation_result['detected_type']}")
        logger.info(f"   - Hash: {validation_result['file_hash'][:16]}...")
        logger.info(f"   - Tamanho: {validation_result['file_size']} bytes")
        
        # Tentar Vercel Blob primeiro
        blob_result = save_file_blob(file)
        if blob_result:
            # Adicionar informações de segurança
            blob_result.update({
                'file_hash': validation_result['file_hash'],
                'detected_type': validation_result['detected_type'],
                'nome_arquivo_original': validation_result['safe_filename']  # Usar nome sanitizado
            })
            logger.info(f"✅ Arquivo salvo no Vercel Blob com segurança")
            return blob_result
        
        # Fallback para sistema local
        logger.warning("⚠️ Fallback para sistema local")
        local_result = save_file_legacy(file)
        if local_result:
            local_result.update({
                'file_hash': validation_result['file_hash'],
                'detected_type': validation_result['detected_type'],
                'nome_arquivo_original': validation_result['safe_filename']
            })
        return local_result
        
    except ValueError as e:
        logger.error(f"❌ Validação de arquivo falhou: {str(e)}")
        raise ValueError(f"Arquivo rejeitado: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Erro no processamento do arquivo: {str(e)}")
        raise ValueError("Erro interno no processamento do arquivo")


def validate_registro_data(data, files):
    """Valida dados do registro"""
    errors = []
    required_fields = ['titulo', 'tipo_registro',
                       'descricao', 'tipo_registro_id', 'data_registro']

    # ← CORREÇÃO CRÍTICA: Melhor validação dos campos
    for field in required_fields:
        value = data.get(field)
        if not value or str(value).strip() == '':
            errors.append(f'Campo {field} é obrigatório')

    # ← CORREÇÃO: Validar se obra_id existe para admin
    if 'obra_id' in data:
        obra_id = data.get('obra_id')
        if not obra_id or str(obra_id).strip() == '':
            errors.append('Campo obra_id é obrigatório')

    if 'anexo' in files and files['anexo'].filename != '':
        file = files['anexo']
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)

        if size > 16 * 1024 * 1024:
            errors.append('Arquivo muito grande (máximo 16MB)')
        if not allowed_file(file.filename, file.mimetype):
            errors.append('Tipo de arquivo não permitido')

    return errors


@registros_bp.route('/<int:registro_id>/debug', methods=['GET'])
@token_required
def debug_registro(current_user, registro_id):
    """Debug de registro para troubleshooting"""
    try:
        logger.info(f"🔍 DEBUG: Buscando registro ID {registro_id}")

        registro = Registro.query.get(registro_id)
        if not registro:
            logger.error(f"❌ DEBUG: Registro {registro_id} não encontrado")
            return jsonify({
                'message': f'Registro {registro_id} não encontrado',
                'exists': False
            }), 404

        logger.info(f"✅ DEBUG: Registro {registro_id} encontrado")
        logger.info(f"   - Título: {registro.titulo}")
        logger.info(f"   - Tem blob_url: {bool(registro.blob_url)}")
        logger.info(f"   - Tem caminho_anexo: {bool(registro.caminho_anexo)}")
        logger.info(f"   - Blob URL: {registro.blob_url}")
        logger.info(f"   - Caminho anexo: {registro.caminho_anexo}")
        logger.info(f"   - Formato arquivo: {registro.formato_arquivo}")
        logger.info(f"   - Nome original: {registro.nome_arquivo_original}")

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
                'formato_arquivo': registro.formato_arquivo,
                'tem_anexo': bool(registro.blob_url or registro.caminho_anexo)
            }
        }), 200

    except Exception as e:
        logger.error(f"❌ DEBUG: Erro ao buscar registro {registro_id}: {str(e)}")
        return jsonify({
            'message': f'Erro interno: {str(e)}',
            'exists': False
        }), 500


@registros_bp.route('/<int:registro_id>/download', methods=['GET'])
@token_required
@obra_access_required
def download_anexo(current_user, registro_id):
    try:
        logger.info(f"🔽 DOWNLOAD: Iniciando download do registro {registro_id}")
        logger.info(f"   - Usuário: {current_user.username} (ID: {current_user.id})")

        registro = Registro.query.get(registro_id)
        if not registro:
            logger.error(f"❌ DOWNLOAD: Registro {registro_id} não encontrado")
            return jsonify({'message': 'Registro não encontrado'}), 404

        logger.info(f"✅ DOWNLOAD: Registro {registro_id} encontrado")
        logger.info(f"   - Título: {registro.titulo}")
        logger.info(f"   - Nome original: {registro.nome_arquivo_original}")
        logger.info(f"   - Formato: {registro.formato_arquivo}")

        # Verificar permissões
        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            logger.error(
                f"❌ DOWNLOAD: Acesso negado - usuário obra {current_user.obra_id} != registro obra {registro.obra_id}")
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        logger.info(f"✅ DOWNLOAD: Permissões OK")
        logger.info(f"   - Tem blob_url: {bool(registro.blob_url)}")
        logger.info(f"   - Tem caminho_anexo: {bool(registro.caminho_anexo)}")

        # ← CORRIGIDO: Melhor detecção de tipo e nome do arquivo
        if registro.blob_url:
            try:
                logger.info(f"🔗 DOWNLOAD: Fazendo proxy do Vercel Blob")
                logger.info(f"   - URL: {registro.blob_url}")

                # Headers para requisição
                headers = {
                    'User-Agent': 'GEDO-CIMCOP/1.0',
                    'Accept': '*/*'
                }

                logger.info("📡 DOWNLOAD: Fazendo requisição para Vercel Blob...")
                response = requests.get(
                    registro.blob_url, headers=headers, stream=True, timeout=60)
                response.raise_for_status()

                logger.info(
                    f"✅ DOWNLOAD: Resposta do Vercel Blob: {response.status_code}")
                logger.info(
                    f"   - Content-Type original: {response.headers.get('content-type')}")
                logger.info(
                    f"   - Content-Length: {response.headers.get('content-length')}")

                # ← CORREÇÃO CRÍTICA: Melhor detecção de Content-Type e nome do arquivo

                # 1. Determinar extensão do arquivo
                file_extension = None
                if registro.formato_arquivo:
                    file_extension = registro.formato_arquivo.lower()
                elif registro.nome_arquivo_original and '.' in registro.nome_arquivo_original:
                    file_extension = registro.nome_arquivo_original.rsplit('.', 1)[
                        1].lower()

                logger.info(f"📎 DOWNLOAD: Extensão detectada: {file_extension}")

                # 2. Determinar Content-Type correto baseado na extensão
                content_type_map = {
                    'pdf': 'application/pdf',
                    'doc': 'application/msword',
                    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'xls': 'application/vnd.ms-excel',
                    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'ppt': 'application/vnd.ms-powerpoint',
                    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                    'png': 'image/png',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'gif': 'image/gif',
                    'bmp': 'image/bmp',
                    'tiff': 'image/tiff',
                    'txt': 'text/plain',
                    'csv': 'text/csv',
                    'zip': 'application/zip',
                    'rar': 'application/x-rar-compressed',
                    '7z': 'application/x-7z-compressed',
                    'mp4': 'video/mp4',
                    'avi': 'video/x-msvideo',
                    'mp3': 'audio/mpeg',
                    'wav': 'audio/wav'
                }

                # Usar Content-Type baseado na extensão
                if file_extension and file_extension in content_type_map:
                    content_type = content_type_map[file_extension]
                else:
                    # Tentar usar o Content-Type da resposta
                    content_type = response.headers.get(
                        'content-type', 'application/octet-stream')
                    # Se for genérico, usar mimetypes
                    if content_type == 'application/octet-stream' and file_extension:
                        guessed_type = mimetypes.guess_type(
                            f"file.{file_extension}")[0]
                        if guessed_type:
                            content_type = guessed_type

                logger.info(f"📎 DOWNLOAD: Content-Type final: {content_type}")

                # 3. Determinar nome do arquivo com extensão correta
                if registro.nome_arquivo_original:
                    filename = registro.nome_arquivo_original
                    # ← CORREÇÃO CRÍTICA: Garantir que tem a extensão correta
                    if file_extension and not filename.lower().endswith(f'.{file_extension}'):
                        # Se o nome não tem extensão, adicionar
                        if '.' not in filename:
                            filename = f"{filename}.{file_extension}"
                        # Se tem extensão diferente, substituir
                        else:
                            base_name = filename.rsplit('.', 1)[0]
                            filename = f"{base_name}.{file_extension}"
                else:
                    # Nome padrão com extensão
                    if file_extension:
                        filename = f"anexo_{registro_id}.{file_extension}"
                    else:
                        filename = f"anexo_{registro_id}"

                logger.info(f"📎 DOWNLOAD: Nome do arquivo final: {filename}")

                # 4. Criar resposta streaming com headers corretos
                def generate():
                    try:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                yield chunk
                    except Exception as e:
                        logger.error(f"❌ DOWNLOAD: Erro no streaming: {str(e)}")
                        raise

                logger.info("🚀 DOWNLOAD: Iniciando streaming do arquivo...")

                # ← CORREÇÃO CRÍTICA: Headers mais específicos para forçar download correto
                response_headers = {
                    'Content-Type': content_type,
                    'Content-Disposition': f'attachment; filename="{filename}"',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'X-Content-Type-Options': 'nosniff'
                }

                # Adicionar Content-Length se disponível
                content_length = response.headers.get('content-length')
                if content_length:
                    response_headers['Content-Length'] = content_length

                logger.info(f"📋 DOWNLOAD: Headers da resposta: {response_headers}")

                return Response(
                    generate(),
                    headers=response_headers
                )

            except requests.RequestException as e:
                logger.error(f"❌ DOWNLOAD: Erro ao baixar do Vercel Blob: {str(e)}")
                return jsonify({'message': f'Erro ao acessar arquivo no storage: {str(e)}'}), 500
            except Exception as e:
                logger.error(f"❌ DOWNLOAD: Erro geral no Blob: {str(e)}")
                return jsonify({'message': f'Erro interno no download: {str(e)}'}), 500

        # Fallback para sistema antigo
        if not registro.caminho_anexo:
            logger.error("❌ DOWNLOAD: Registro não possui anexo")
            return jsonify({'message': 'Este registro não possui anexo'}), 404

        logger.info(f"📁 DOWNLOAD: Usando sistema local: {registro.caminho_anexo}")
        if not os.path.exists(registro.caminho_anexo):
            logger.error(
                f"❌ DOWNLOAD: Arquivo local não encontrado: {registro.caminho_anexo}")
            return jsonify({'message': 'Arquivo não encontrado no servidor'}), 404

        logger.info("✅ DOWNLOAD: Enviando arquivo local")

        # ← CORREÇÃO: Melhor detecção para arquivos locais também
        filename = registro.nome_arquivo_original or f'anexo_{registro_id}'
        if registro.formato_arquivo and not filename.lower().endswith(f'.{registro.formato_arquivo}'):
            if '.' not in filename:
                filename = f"{filename}.{registro.formato_arquivo}"

        # Detectar mimetype para arquivo local
        mimetype = 'application/octet-stream'
        if registro.formato_arquivo:
            guessed_type = mimetypes.guess_type(
                f"file.{registro.formato_arquivo}")[0]
            if guessed_type:
                mimetype = guessed_type

        return send_file(
            registro.caminho_anexo,
            as_attachment=True,
            download_name=filename,
            mimetype=mimetype
        )

    except Exception as e:
        logger.error(f"❌ DOWNLOAD: Erro geral: {str(e)}")
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
@limiter.limit("10 per minute;100 per hour")
@token_required
@obra_access_required
def create_registro(current_user):
    try:
        # ← CORREÇÃO CRÍTICA: Melhor debug dos dados recebidos
        logger.info(f"📥 CREATE REGISTRO: Dados recebidos")
        logger.info(f"   - Form data: {dict(request.form)}")
        logger.info(f"   - Files: {list(request.files.keys())}")
        logger.info(
            f"   - User: {current_user.username} (role: {current_user.role})")

        # ← CORREÇÃO: Validação mais robusta
        validation_errors = validate_registro_data(request.form, request.files)
        if validation_errors:
            logger.error(
                f"❌ CREATE REGISTRO: Erros de validação: {validation_errors}")
            return jsonify({'message': '; '.join(validation_errors)}), 400

        # ← CORREÇÃO: Extrair dados com validação
        titulo = bleach.clean(request.form.get('titulo', '').strip())
        tipo_registro = bleach.clean(request.form.get('tipo_registro', '').strip())
        descricao = bleach.clean(request.form.get('descricao', '').strip())
        codigo_numero = request.form.get('codigo_numero', '').strip()
        data_registro = request.form.get('data_registro', '').strip()
        obra_id = request.form.get('obra_id')
        tipo_registro_id = request.form.get('tipo_registro_id')

        # NOVO: Campos de classificação
        classificacao_grupo = bleach.clean(request.form.get('classificacao_grupo', '').strip())
        classificacao_subgrupo = bleach.clean(request.form.get('classificacao_subgrupo', '').strip())
        classificacao_id = request.form.get('classificacao_id')

        logger.info(f"📋 CREATE REGISTRO: Campos extraídos")
        logger.info(f"   - titulo: '{titulo}'")
        logger.info(f"   - tipo_registro: '{tipo_registro}'")
        logger.info(f"   - descricao: '{descricao[:50]}...'")
        logger.info(f"   - obra_id: '{obra_id}'")
        logger.info(f"   - tipo_registro_id: '{tipo_registro_id}'")
        logger.info(f"   - classificacao_grupo: '{classificacao_grupo}'")
        logger.info(f"   - classificacao_subgrupo: '{classificacao_subgrupo}'")

        # ← CORREÇÃO: Conversão segura de IDs
        try:
            if obra_id:
                obra_id = int(obra_id)
            if tipo_registro_id:
                tipo_registro_id = int(tipo_registro_id)
            if classificacao_id:
                classificacao_id = int(classificacao_id)
        except (ValueError, TypeError) as e:
            logger.error(f"❌ CREATE REGISTRO: Erro na conversão de IDs: {str(e)}")
            return jsonify({'message': 'IDs inválidos fornecidos'}), 400

        # ← CORREÇÃO: Lógica de obra mais clara
        if current_user.role == 'usuario_padrao':
            obra_id = current_user.obra_id
            logger.info(f"📍 CREATE REGISTRO: Usuário padrão - usando obra {obra_id}")
        elif not obra_id:
            logger.error(f"❌ CREATE REGISTRO: Admin sem obra_id")
            return jsonify({'message': 'Obra é obrigatória para administradores'}), 400

        # Verificar se obra existe
        obra = Obra.query.get(obra_id)
        if not obra:
            logger.error(f"❌ CREATE REGISTRO: Obra {obra_id} não encontrada")
            return jsonify({'message': 'Obra não encontrada'}), 404

        logger.info(
            f"✅ CREATE REGISTRO: Obra encontrada: {obra.nome} (status: {obra.status})")

        # Verificar se obra está suspensa
        if obra.status and obra.status.lower() == 'suspensa':
            logger.error(f"❌ CREATE REGISTRO: Obra suspensa")
            return jsonify({'message': 'A obra está suspensa e não pode receber novos registros.'}), 403

        # Verificar permissões de acesso à obra
        if current_user.role == 'usuario_padrao' and obra_id != current_user.obra_id:
            logger.error(f"❌ CREATE REGISTRO: Acesso negado à obra")
            return jsonify({'message': 'Acesso negado a esta obra'}), 403

        # ← CORREÇÃO: Conversão de data mais robusta
        data_registro_dt = datetime.utcnow()
        if data_registro:
            try:
                data_registro_dt = datetime.strptime(data_registro, '%Y-%m-%d')
                logger.info(
                    f"📅 CREATE REGISTRO: Data convertida: {data_registro_dt}")
            except ValueError as e:
                logger.error(
                    f"❌ CREATE REGISTRO: Erro na conversão de data: {str(e)}")
                return jsonify({'message': 'Formato de data_registro inválido (use YYYY-MM-DD)'}), 400

        # ← CORREÇÃO: Processamento de arquivo mais robusto
        file_info = {}
        if 'anexo' in request.files:
            file = request.files['anexo']
            if file and file.filename and file.filename.strip() != '':
                logger.info(
                    f"📤 CREATE REGISTRO: Processando arquivo {file.filename}")
                try:
                    file_data = save_file(file)
                    if file_data:
                        file_info = file_data
                        logger.info(
                            f"✅ CREATE REGISTRO: Arquivo processado: {file_data.get('nome_arquivo_original')}")
                    else:
                        logger.error(f"❌ CREATE REGISTRO: Falha no processamento do arquivo")
                        return jsonify({'message': 'Formato de arquivo não permitido ou erro no upload'}), 400
                except Exception as e:
                    logger.error(f"❌ CREATE REGISTRO: Erro no upload: {str(e)}")
                    return jsonify({'message': f'Erro no upload do arquivo: {str(e)}'}), 500

        # ← CORREÇÃO: Criação do registro com tratamento de erro
        try:
            logger.info(f"💾 CREATE REGISTRO: Criando registro no banco...")
            # Remover file_hash se existir em file_info
            if 'file_hash' in file_info:
                del file_info['file_hash']
            registro = Registro(
                titulo=titulo,
                tipo_registro=tipo_registro,
                descricao=descricao,
                autor_id=current_user.id,
                obra_id=obra_id,
                data_registro=data_registro_dt,
                codigo_numero=codigo_numero if codigo_numero else None,
                tipo_registro_id=tipo_registro_id if tipo_registro_id else None,
                classificacao_grupo=classificacao_grupo if classificacao_grupo else None,
                classificacao_subgrupo=classificacao_subgrupo if classificacao_subgrupo else None,
                classificacao_id=classificacao_id if classificacao_id else None,
                **file_info
            )

            db.session.add(registro)
            db.session.commit()

            logger.info(
                f"✅ CREATE REGISTRO: Registro criado com sucesso - ID {registro.id}")
            logger.info(f"   - Tem blob_url: {bool(registro.blob_url)}")
            logger.info(f"   - Tem caminho_anexo: {bool(registro.caminho_anexo)}")
            logger.info(f"   - Formato: {registro.formato_arquivo}")
            logger.info(
                f"   - Classificação: {registro.classificacao_grupo} > {registro.classificacao_subgrupo}")

        except Exception as e:
            logger.error(f"❌ CREATE REGISTRO: Erro ao salvar no banco: {str(e)}")
            db.session.rollback()
            return jsonify({'message': f'Erro ao salvar registro: {str(e)}'}), 500

        # ← OPCIONAL: Workflow (não crítico)
        try:
            from services.email_service import processar_workflow_registro
            processar_workflow_registro(registro, 'criacao')
        except Exception as e:
            logger.warning(f"⚠️ CREATE REGISTRO: Erro no workflow (não crítico): {e}")

        return jsonify({
            'message': 'Registro criado com sucesso',
            'registro': registro.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"❌ CREATE REGISTRO: Erro geral: {str(e)}")
        import traceback
        traceback.print_exc()
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
            registro.titulo = bleach.clean(request.form['titulo'])
        if 'tipo_registro' in request.form:
            registro.tipo_registro = bleach.clean(request.form['tipo_registro'])
        if 'descricao' in request.form:
            registro.descricao = bleach.clean(request.form['descricao'])
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

        # NOVO: Atualizar campos de classificação
        if 'classificacao_grupo' in request.form:
            registro.classificacao_grupo = bleach.clean(request.form['classificacao_grupo'])
        if 'classificacao_subgrupo' in request.form:
            registro.classificacao_subgrupo = bleach.clean(request.form['classificacao_subgrupo'])
        if 'classificacao_id' in request.form:
            registro.classificacao_id = request.form.get(
                'classificacao_id', type=int)

        # Processar novo arquivo
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

        # Deletar arquivo do Blob ou local
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
