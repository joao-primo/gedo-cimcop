from flask import Blueprint, request, jsonify, send_file, redirect, Response
from models.registro import Registro, db
from models.obra import Obra
from models.tipo_registro import TipoRegistro
from routes.auth import token_required, obra_access_required
from services.blob_service import blob_service
from sqlalchemy import or_, and_, func, text, desc
from datetime import datetime
import os
import requests
import mimetypes
import pandas as pd
from io import BytesIO
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.security import audit_log
import logging

pesquisa_bp = Blueprint('pesquisa', __name__)
logger = logging.getLogger(__name__)


@pesquisa_bp.route('/', methods=['GET'])
@jwt_required()
def pesquisar_registros():
    try:
        current_user_id = get_jwt_identity()

        # Parâmetros de pesquisa
        palavra_chave = request.args.get('palavra_chave', '').strip()
        obra_id = request.args.get('obra_id', type=int)
        tipo_registro_id = request.args.get('tipo_registro_id', type=int)
        data_registro_inicio = request.args.get('data_registro_inicio')
        data_registro_fim = request.args.get('data_registro_fim')
        classificacao_grupo = request.args.get(
            'classificacao_grupo', '').strip()
        classificacao_subgrupo = request.args.get(
            'classificacao_subgrupo', '').strip()

        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)

        try:
            # Query base defensiva
            query = db.session.query(Registro)

            # Filtros
            if palavra_chave:
                query = query.filter(
                    or_(
                        Registro.descricao.ilike(f'%{palavra_chave}%'),
                        Registro.observacoes.ilike(f'%{palavra_chave}%')
                    )
                )

            if obra_id and obra_id != 0:
                query = query.filter(Registro.obra_id == obra_id)

            if tipo_registro_id and tipo_registro_id != 0:
                query = query.filter(
                    Registro.tipo_registro_id == tipo_registro_id)

            # Filtros de data
            if data_registro_inicio:
                try:
                    data_inicio = datetime.strptime(
                        data_registro_inicio, '%Y-%m-%d').date()
                    query = query.filter(
                        func.date(Registro.data_registro) >= data_inicio)
                except ValueError:
                    pass

            if data_registro_fim:
                try:
                    data_fim = datetime.strptime(
                        data_registro_fim, '%Y-%m-%d').date()
                    query = query.filter(
                        func.date(Registro.data_registro) <= data_fim)
                except ValueError:
                    pass

            # Filtros de classificação (verificar se colunas existem)
            try:
                if classificacao_grupo:
                    query = query.filter(
                        Registro.classificacao_grupo == classificacao_grupo)

                if classificacao_subgrupo:
                    query = query.filter(
                        Registro.classificacao_subgrupo == classificacao_subgrupo)
            except Exception as e:
                logger.warning(
                    f"Colunas de classificação não encontradas: {str(e)}")

            # Ordenação
            query = query.order_by(desc(Registro.data_registro))

            # Paginação
            total = query.count()
            registros = query.offset(
                (page - 1) * per_page).limit(per_page).all()

            # Converter para dicionário
            registros_data = []
            for registro in registros:
                registro_dict = {
                    'id': registro.id,
                    'obra_id': registro.obra_id,
                    'tipo_registro_id': registro.tipo_registro_id,
                    'descricao': registro.descricao,
                    'observacoes': registro.observacoes,
                    'data_registro': registro.data_registro.isoformat() if registro.data_registro else None,
                    'anexos_count': 0  # Default
                }

                # Adicionar campos de classificação se existirem
                try:
                    if hasattr(registro, 'classificacao_grupo'):
                        registro_dict['classificacao_grupo'] = registro.classificacao_grupo
                    if hasattr(registro, 'classificacao_subgrupo'):
                        registro_dict['classificacao_subgrupo'] = registro.classificacao_subgrupo
                    if hasattr(registro, 'anexos_count'):
                        registro_dict['anexos_count'] = registro.anexos_count or 0
                except Exception:
                    pass

                registros_data.append(registro_dict)

            # Calcular páginas
            pages = (total + per_page - 1) // per_page

            resultado = {
                'registros': registros_data,
                'total': total,
                'page': page,
                'per_page': per_page,
                'pages': pages
            }

            audit_log(current_user_id, 'SEARCH_RECORDS', details={
                'filters': {
                    'palavra_chave': palavra_chave,
                    'obra_id': obra_id,
                    'tipo_registro_id': tipo_registro_id,
                    'data_inicio': data_registro_inicio,
                    'data_fim': data_registro_fim,
                    'classificacao_grupo': classificacao_grupo,
                    'classificacao_subgrupo': classificacao_subgrupo
                },
                'results': total
            })

            return jsonify(resultado)

        except Exception as e:
            logger.error(f"Erro na query de pesquisa: {str(e)}")
            return jsonify({
                'registros': [],
                'total': 0,
                'page': 1,
                'per_page': per_page,
                'pages': 0
            })

    except Exception as e:
        logger.error(f"Erro geral na pesquisa: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500


@pesquisa_bp.route('/filtros', methods=['GET'])
@jwt_required()
def get_filtros():
    try:
        current_user_id = get_jwt_identity()

        # Buscar obras
        obras = db.session.query(Obra).filter(Obra.ativo == True).all()
        obras_data = [{'id': obra.id, 'nome': obra.nome} for obra in obras]

        # Buscar tipos de registro
        tipos = db.session.query(TipoRegistro).filter(
            TipoRegistro.ativo == True).all()
        tipos_data = [{'id': tipo.id, 'nome': tipo.nome} for tipo in tipos]

        # Buscar classificações (se existirem)
        classificacoes_data = []
        try:
            # Verificar se existe tabela de classificações
            from ..models.classificacao import Classificacao
            classificacoes = db.session.query(Classificacao).all()
            classificacoes_data = [
                {
                    'id': c.id,
                    'grupo': c.grupo,
                    'subgrupo': c.subgrupo
                } for c in classificacoes
            ]
        except Exception as e:
            logger.warning(
                f"Tabela de classificações não encontrada: {str(e)}")

        filtros = {
            'obras': obras_data,
            'tipos_registro': tipos_data,
            'classificacoes': classificacoes_data
        }

        audit_log(current_user_id, 'SEARCH_FILTERS_VIEW')
        return jsonify(filtros)

    except Exception as e:
        logger.error(f"Erro ao buscar filtros: {str(e)}")
        return jsonify({
            'obras': [],
            'tipos_registro': [],
            'classificacoes': []
        })


@pesquisa_bp.route('/exportar', methods=['GET'])
@jwt_required()
def exportar_resultados():
    try:
        current_user_id = get_jwt_identity()

        # Mesma lógica de filtros da pesquisa
        palavra_chave = request.args.get('palavra_chave', '').strip()
        obra_id = request.args.get('obra_id', type=int)
        tipo_registro_id = request.args.get('tipo_registro_id', type=int)
        data_registro_inicio = request.args.get('data_registro_inicio')
        data_registro_fim = request.args.get('data_registro_fim')
        classificacao_grupo = request.args.get(
            'classificacao_grupo', '').strip()
        classificacao_subgrupo = request.args.get(
            'classificacao_subgrupo', '').strip()

        # Query base
        query = db.session.query(
            Registro.id,
            Registro.descricao,
            Registro.observacoes,
            Registro.data_registro,
            Obra.nome.label('obra_nome'),
            TipoRegistro.nome.label('tipo_nome')
        ).join(
            Obra, Registro.obra_id == Obra.id
        ).join(
            TipoRegistro, Registro.tipo_registro_id == TipoRegistro.id
        )

        # Aplicar filtros (mesma lógica da pesquisa)
        if palavra_chave:
            query = query.filter(
                or_(
                    Registro.descricao.ilike(f'%{palavra_chave}%'),
                    Registro.observacoes.ilike(f'%{palavra_chave}%')
                )
            )

        if obra_id and obra_id != 0:
            query = query.filter(Registro.obra_id == obra_id)

        if tipo_registro_id and tipo_registro_id != 0:
            query = query.filter(Registro.tipo_registro_id == tipo_registro_id)

        if data_registro_inicio:
            try:
                data_inicio = datetime.strptime(
                    data_registro_inicio, '%Y-%m-%d').date()
                query = query.filter(
                    func.date(Registro.data_registro) >= data_inicio)
            except ValueError:
                pass

        if data_registro_fim:
            try:
                data_fim = datetime.strptime(
                    data_registro_fim, '%Y-%m-%d').date()
                query = query.filter(
                    func.date(Registro.data_registro) <= data_fim)
            except ValueError:
                pass

        # Filtros de classificação (se existirem)
        try:
            if classificacao_grupo:
                query = query.filter(
                    Registro.classificacao_grupo == classificacao_grupo)

            if classificacao_subgrupo:
                query = query.filter(
                    Registro.classificacao_subgrupo == classificacao_subgrupo)
        except Exception:
            pass

        # Ordenação
        query = query.order_by(desc(Registro.data_registro))

        # Executar query
        registros = query.all()

        # Criar Excel
        import pandas as pd
        from io import BytesIO

        dados = []
        for registro in registros:
            linha = {
                'ID': registro.id,
                'Obra': registro.obra_nome,
                'Tipo': registro.tipo_nome,
                'Descrição': registro.descricao or '',
                'Observações': registro.observacoes or '',
                'Data': registro.data_registro.strftime('%d/%m/%Y') if registro.data_registro else ''
            }

            # Adicionar classificações se existirem
            try:
                if hasattr(registro, 'classificacao_grupo'):
                    linha['Grupo'] = getattr(
                        registro, 'classificacao_grupo', '')
                if hasattr(registro, 'classificacao_subgrupo'):
                    linha['Subgrupo'] = getattr(
                        registro, 'classificacao_subgrupo', '')
            except Exception:
                pass

            dados.append(linha)

        df = pd.DataFrame(dados)

        # Criar arquivo Excel em memória
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Registros', index=False)

        output.seek(0)

        audit_log(current_user_id, 'EXPORT_SEARCH_RESULTS',
                  details={'total_exported': len(registros)})

        from flask import Response
        return Response(
            output.getvalue(),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename=registros_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            }
        )

    except Exception as e:
        logger.error(f"Erro ao exportar resultados: {str(e)}")
        return jsonify({'error': 'Erro ao exportar resultados'}), 500


@pesquisa_bp.route('/<int:registro_id>/visualizar', methods=['GET'])
@token_required
@obra_access_required
def visualizar_registro(current_user, registro_id):
    try:
        registro = Registro.query.get(registro_id)
        if not registro:
            return jsonify({'message': 'Registro não encontrado'}), 404

        # Verificar permissões
        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        registro_dict = registro.to_dict()

        # Adicionar classificações se existirem
        try:
            if hasattr(registro, 'classificacao_grupo'):
                registro_dict['classificacao_grupo'] = registro.classificacao_grupo
            if hasattr(registro, 'classificacao_subgrupo'):
                registro_dict['classificacao_subgrupo'] = registro.classificacao_subgrupo
        except:
            pass

        return jsonify({
            'registro': registro_dict
        }), 200

    except Exception as e:
        print(f"Erro ao visualizar registro: {str(e)}")
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@pesquisa_bp.route('/<int:registro_id>/download', methods=['GET'])
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
        print(f"   - Nome original: {registro.nome_arquivo_original}")
        print(f"   - Formato: {registro.formato_arquivo}")

        # Verificar permissões
        if current_user.role == 'usuario_padrao' and registro.obra_id != current_user.obra_id:
            print(
                f"❌ DOWNLOAD: Acesso negado - usuário obra {current_user.obra_id} != registro obra {registro.obra_id}")
            return jsonify({'message': 'Acesso negado a este registro'}), 403

        print(f"✅ DOWNLOAD: Permissões OK")
        print(f"   - Tem blob_url: {bool(registro.blob_url)}")
        print(f"   - Tem caminho_anexo: {bool(registro.caminho_anexo)}")

        # ← CORRIGIDO: Melhor detecção de tipo e nome do arquivo
        if registro.blob_url:
            try:
                print(f"🔗 DOWNLOAD: Fazendo proxy do Vercel Blob")
                print(f"   - URL: {registro.blob_url}")

                # Headers para requisição
                headers = {
                    'User-Agent': 'GEDO-CIMCOP/1.0',
                    'Accept': '*/*'
                }

                print("📡 DOWNLOAD: Fazendo requisição para Vercel Blob...")
                response = requests.get(
                    registro.blob_url, headers=headers, stream=True, timeout=60)
                response.raise_for_status()

                print(
                    f"✅ DOWNLOAD: Resposta do Vercel Blob: {response.status_code}")
                print(
                    f"   - Content-Type original: {response.headers.get('content-type')}")
                print(
                    f"   - Content-Length: {response.headers.get('content-length')}")

                # ← CORREÇÃO CRÍTICA: Melhor detecção de Content-Type e nome do arquivo

                # 1. Determinar extensão do arquivo
                file_extension = None
                if registro.formato_arquivo:
                    file_extension = registro.formato_arquivo.lower()
                elif registro.nome_arquivo_original and '.' in registro.nome_arquivo_original:
                    file_extension = registro.nome_arquivo_original.rsplit('.', 1)[
                        1].lower()

                print(f"📎 DOWNLOAD: Extensão detectada: {file_extension}")

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

                print(f"📎 DOWNLOAD: Content-Type final: {content_type}")

                # 3. Determinar nome do arquivo com extensão correta
                if registro.nome_arquivo_original:
                    filename = registro.nome_arquivo_original
                    # Garantir que tem a extensão correta
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

                print(f"📎 DOWNLOAD: Nome do arquivo final: {filename}")

                # 4. Criar resposta streaming com headers corretos
                def generate():
                    try:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                yield chunk
                    except Exception as e:
                        print(f"❌ DOWNLOAD: Erro no streaming: {str(e)}")
                        raise

                print("🚀 DOWNLOAD: Iniciando streaming do arquivo...")

                # ← CORREÇÃO: Headers mais específicos para forçar download correto
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

                print(f"📋 DOWNLOAD: Headers da resposta: {response_headers}")

                return Response(
                    generate(),
                    headers=response_headers
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
        print(f"❌ DOWNLOAD: Erro geral: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@pesquisa_bp.route('/<int:registro_id>/debug', methods=['GET'])
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
        print(f"   - Formato arquivo: {registro.formato_arquivo}")
        print(f"   - Nome original: {registro.nome_arquivo_original}")

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
        print(f"❌ DEBUG: Erro ao buscar registro {registro_id}: {str(e)}")
        return jsonify({
            'message': f'Erro interno: {str(e)}',
            'exists': False
        }), 500
