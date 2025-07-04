from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from models.registro import Registro, db
from models.obra import Obra
from models.tipo_registro import TipoRegistro
from routes.auth import token_required, obra_access_required
from datetime import datetime
import pandas as pd
import os
import uuid
import tempfile
from io import BytesIO

importacao_bp = Blueprint('importacao', __name__)
importacao_bp.strict_slashes = False

ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@importacao_bp.route('/template', methods=['GET'])
@token_required
@obra_access_required
def download_template(current_user):
    """Gera e retorna template Excel para importação"""
    try:
        # Buscar dados para o template
        if current_user.role == 'administrador':
            obras = Obra.query.all()
        else:
            obras = Obra.query.filter_by(id=current_user.obra_id).all()

        tipos_registro = TipoRegistro.query.all()

        # Criar DataFrame com exemplo
        template_data = {
            'titulo': ['Exemplo - Contrato Principal', 'Exemplo - ART do Projeto'],
            'tipo_registro': ['Contrato', 'ART'],
            'tipo_registro_id': [1, 2],  # IDs dos tipos
            'data_registro': ['2024-01-15', '2024-01-20'],
            'codigo_numero': ['CONT-001', 'ART-001'],
            'descricao': [
                'Contrato principal da obra com especificações técnicas detalhadas',
                'Anotação de Responsabilidade Técnica do projeto estrutural'
            ],
            'obra_id': [obras[0].id if obras else 1, obras[0].id if obras else 1],
            'obra_nome': [obras[0].nome if obras else 'Obra Exemplo', obras[0].nome if obras else 'Obra Exemplo']
        }

        # Criar arquivo Excel
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Aba principal com dados
            df_template = pd.DataFrame(template_data)
            df_template.to_excel(writer, sheet_name='Registros', index=False)

            # Aba com obras disponíveis
            df_obras = pd.DataFrame([{
                'id': obra.id,
                'nome': obra.nome,
                'codigo': obra.codigo
            } for obra in obras])
            df_obras.to_excel(
                writer, sheet_name='Obras_Disponíveis', index=False)

            # Aba com tipos de registro
            df_tipos = pd.DataFrame([{
                'id': tipo.id,
                'nome': tipo.nome,
                'descricao': tipo.descricao
            } for tipo in tipos_registro])
            df_tipos.to_excel(writer, sheet_name='Tipos_Registro', index=False)

            # Aba com instruções
            instrucoes = pd.DataFrame({
                'Campo': [
                    'titulo', 'tipo_registro', 'tipo_registro_id', 'data_registro',
                    'codigo_numero', 'descricao', 'obra_id', 'obra_nome'
                ],
                'Obrigatório': ['Sim', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim', 'Sim', 'Não'],
                'Formato': [
                    'Texto livre', 'Nome do tipo', 'ID numérico', 'YYYY-MM-DD',
                    'Código único', 'Texto livre', 'ID numérico', 'Apenas referência'
                ],
                'Exemplo': [
                    'Contrato Principal', 'Contrato', '1', '2024-01-15',
                    'CONT-001', 'Descrição detalhada...', '1', 'Obra Exemplo'
                ]
            })
            instrucoes.to_excel(writer, sheet_name='Instruções', index=False)

        output.seek(0)

        return send_file(
            BytesIO(output.read()),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'template_importacao_registros_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )

    except Exception as e:
        return jsonify({'message': f'Erro ao gerar template: {str(e)}'}), 500


@importacao_bp.route('/processar', methods=['POST'])
@token_required
@obra_access_required
def processar_planilha(current_user):
    """Processa planilha e retorna dados para revisão"""
    try:
        if 'arquivo' not in request.files:
            return jsonify({'message': 'Nenhum arquivo enviado'}), 400

        file = request.files['arquivo']
        if file.filename == '':
            return jsonify({'message': 'Nenhum arquivo selecionado'}), 400

        if not allowed_file(file.filename):
            return jsonify({'message': 'Formato de arquivo não permitido. Use Excel (.xlsx, .xls) ou CSV'}), 400

        # Ler arquivo
        try:
            if file.filename.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file, sheet_name='Registros')
        except Exception as e:
            return jsonify({'message': f'Erro ao ler arquivo: {str(e)}'}), 400

        # Validar colunas obrigatórias
        colunas_obrigatorias = ['titulo', 'tipo_registro', 'tipo_registro_id',
                                'data_registro', 'codigo_numero', 'descricao', 'obra_id']
        colunas_faltantes = [
            col for col in colunas_obrigatorias if col not in df.columns]

        if colunas_faltantes:
            return jsonify({
                'message': f'Colunas obrigatórias faltantes: {", ".join(colunas_faltantes)}'
            }), 400

        # Processar e validar dados
        registros_processados = []
        erros = []

        for index, row in df.iterrows():
            linha = index + 2  # +2 porque pandas começa em 0 e Excel tem cabeçalho
            registro = {}
            erro_linha = []

            try:
                # Validações básicas
                if pd.isna(row['titulo']) or str(row['titulo']).strip() == '':
                    erro_linha.append('Título é obrigatório')
                else:
                    registro['titulo'] = str(row['titulo']).strip()

                if pd.isna(row['tipo_registro_id']):
                    erro_linha.append('ID do tipo de registro é obrigatório')
                else:
                    tipo_id = int(row['tipo_registro_id'])
                    tipo = TipoRegistro.query.get(tipo_id)
                    if not tipo:
                        erro_linha.append(
                            f'Tipo de registro ID {tipo_id} não encontrado')
                    else:
                        registro['tipo_registro_id'] = tipo_id
                        registro['tipo_registro'] = tipo.nome

                if pd.isna(row['obra_id']):
                    erro_linha.append('ID da obra é obrigatório')
                else:
                    obra_id = int(row['obra_id'])
                    obra = Obra.query.get(obra_id)
                    if not obra:
                        erro_linha.append(f'Obra ID {obra_id} não encontrada')
                    elif current_user.role != 'administrador' and obra_id != current_user.obra_id:
                        erro_linha.append(
                            'Você não tem permissão para esta obra')
                    else:
                        registro['obra_id'] = obra_id
                        registro['obra_nome'] = obra.nome

                # Data
                if pd.isna(row['data_registro']):
                    erro_linha.append('Data do registro é obrigatória')
                else:
                    try:
                        if isinstance(row['data_registro'], str):
                            data = datetime.strptime(
                                row['data_registro'], '%Y-%m-%d')
                        else:
                            data = pd.to_datetime(row['data_registro'])
                        registro['data_registro'] = data.strftime('%Y-%m-%d')
                    except:
                        erro_linha.append(
                            'Data inválida (use formato YYYY-MM-DD)')

                # Outros campos
                registro['codigo_numero'] = str(row['codigo_numero']).strip(
                ) if not pd.isna(row['codigo_numero']) else ''
                registro['descricao'] = str(row['descricao']).strip(
                ) if not pd.isna(row['descricao']) else ''

                if erro_linha:
                    erros.append({
                        'linha': linha,
                        'erros': erro_linha,
                        'dados': dict(row)
                    })
                else:
                    registro['linha_original'] = linha
                    # ID temporário para identificar na interface
                    registro['id_temp'] = str(uuid.uuid4())
                    registros_processados.append(registro)

            except Exception as e:
                erros.append({
                    'linha': linha,
                    'erros': [f'Erro ao processar linha: {str(e)}'],
                    'dados': dict(row)
                })

        return jsonify({
            'registros': registros_processados,
            'erros': erros,
            'total_linhas': len(df),
            'total_validos': len(registros_processados),
            'total_erros': len(erros)
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@importacao_bp.route('/finalizar', methods=['POST'])
@token_required
@obra_access_required
def finalizar_importacao(current_user):
    """Finaliza importação criando os registros com anexos"""
    try:
        data = request.get_json()
        registros_data = data.get('registros', [])

        if not registros_data:
            return jsonify({'message': 'Nenhum registro para importar'}), 400

        registros_criados = []
        erros = []

        for registro_data in registros_data:
            try:
                # Verificar se tem anexo
                if not registro_data.get('anexo_path'):
                    erros.append({
                        'id_temp': registro_data.get('id_temp'),
                        'erro': 'Anexo é obrigatório'
                    })
                    continue

                # Criar registro
                registro = Registro(
                    titulo=registro_data['titulo'],
                    tipo_registro=registro_data['tipo_registro'],
                    descricao=registro_data['descricao'],
                    autor_id=current_user.id,
                    obra_id=registro_data['obra_id'],
                    data_registro=datetime.strptime(
                        registro_data['data_registro'], '%Y-%m-%d'),
                    codigo_numero=registro_data.get('codigo_numero'),
                    tipo_registro_id=registro_data['tipo_registro_id'],
                    caminho_anexo=registro_data['anexo_path'],
                    nome_arquivo_original=registro_data.get(
                        'nome_arquivo_original'),
                    formato_arquivo=registro_data.get('formato_arquivo'),
                    tamanho_arquivo=registro_data.get('tamanho_arquivo')
                )

                db.session.add(registro)
                db.session.flush()  # Para obter o ID

                registros_criados.append({
                    'id_temp': registro_data.get('id_temp'),
                    'id': registro.id,
                    'titulo': registro.titulo
                })

            except Exception as e:
                erros.append({
                    'id_temp': registro_data.get('id_temp'),
                    'erro': str(e)
                })

        if registros_criados:
            db.session.commit()

            # Processar workflows para cada registro criado
            try:
                from services.email_service import processar_workflow_registro
                for registro_info in registros_criados:
                    registro = Registro.query.get(registro_info['id'])
                    if registro:
                        processar_workflow_registro(registro, 'criacao')
            except Exception as e:
                print(f"Erro ao processar workflows na importação: {e}")
        else:
            db.session.rollback()

        return jsonify({
            'message': f'{len(registros_criados)} registros importados com sucesso',
            'registros_criados': registros_criados,
            'erros': erros
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@importacao_bp.route('/upload-anexo', methods=['POST'])
@token_required
def upload_anexo_temp(current_user):
    """Upload temporário de anexo durante importação"""
    try:
        if 'arquivo' not in request.files:
            return jsonify({'message': 'Nenhum arquivo enviado'}), 400

        file = request.files['arquivo']
        if file.filename == '':
            return jsonify({'message': 'Nenhum arquivo selecionado'}), 400

        # Validar arquivo
        ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg',
                              'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS):
            return jsonify({'message': 'Formato de arquivo não permitido'}), 400

        # Salvar arquivo temporário
        upload_folder = 'uploads'
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        filename = secure_filename(file.filename)
        unique_filename = f"temp_{uuid.uuid4()}_{filename}"
        file_path = os.path.join(upload_folder, unique_filename)

        file.save(file_path)

        return jsonify({
            'message': 'Arquivo enviado com sucesso',
            'anexo_path': file_path,
            'nome_arquivo_original': filename,
            'formato_arquivo': filename.rsplit('.', 1)[1].lower(),
            'tamanho_arquivo': os.path.getsize(file_path)
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500
