from flask import Blueprint, request, jsonify
from models.configuracao import Configuracao, ConfiguracaoUsuario, db
from routes.auth import token_required, admin_required
import json

configuracoes_bp = Blueprint('configuracoes', __name__)
configuracoes_bp.strict_slashes = False


def inicializar_configuracoes_padrao():
    """Inicializa configurações padrão do sistema"""
    configuracoes_padrao = [
        # Configurações Gerais
        {
            'chave': 'nome_sistema',
            'valor': 'GEDO CIMCOP',
            'descricao': 'Nome do sistema',
            'categoria': 'geral',
            'editavel_usuario': False
        },
        {
            'chave': 'versao_sistema',
            'valor': '1.0.0',
            'descricao': 'Versão atual do sistema',
            'categoria': 'geral',
            'editavel_usuario': False
        },
        {
            'chave': 'empresa_nome',
            'valor': 'CIMCOP',
            'descricao': 'Nome da empresa',
            'categoria': 'geral',
            'editavel_usuario': False
        },

        # Configurações de Sistema
        {
            'chave': 'max_tamanho_arquivo',
            'valor': '50',
            'descricao': 'Tamanho máximo de arquivo em MB',
            'tipo': 'integer',
            'categoria': 'sistema',
            'editavel_usuario': False
        },
        {
            'chave': 'tipos_arquivo_permitidos',
            'valor': 'pdf,doc,docx,xls,xlsx,png,jpg,jpeg,gif,txt',
            'descricao': 'Tipos de arquivo permitidos (separados por vírgula)',
            'categoria': 'sistema',
            'editavel_usuario': False
        },
        {
            'chave': 'backup_automatico',
            'valor': 'true',
            'descricao': 'Ativar backup automático',
            'tipo': 'boolean',
            'categoria': 'sistema',
            'editavel_usuario': False
        },
        {
            'chave': 'intervalo_backup_horas',
            'valor': '24',
            'descricao': 'Intervalo entre backups em horas',
            'tipo': 'integer',
            'categoria': 'sistema',
            'editavel_usuario': False
        },

        # Configurações de Notificação
        {
            'chave': 'notificacoes_email',
            'valor': 'true',
            'descricao': 'Ativar notificações por email',
            'tipo': 'boolean',
            'categoria': 'notificacao',
            'editavel_usuario': True
        },
        {
            'chave': 'notificacoes_sistema',
            'valor': 'true',
            'descricao': 'Ativar notificações do sistema',
            'tipo': 'boolean',
            'categoria': 'notificacao',
            'editavel_usuario': True
        },

        # Configurações de Segurança
        {
            'chave': 'sessao_timeout_minutos',
            'valor': '480',
            'descricao': 'Timeout da sessão em minutos (8 horas)',
            'tipo': 'integer',
            'categoria': 'seguranca',
            'editavel_usuario': False
        },
        {
            'chave': 'senha_min_caracteres',
            'valor': '8',
            'descricao': 'Número mínimo de caracteres para senha',
            'tipo': 'integer',
            'categoria': 'seguranca',
            'editavel_usuario': False
        },
        {
            'chave': 'senha_requer_maiuscula',
            'valor': 'true',
            'descricao': 'Senha deve conter letra maiúscula',
            'tipo': 'boolean',
            'categoria': 'seguranca',
            'editavel_usuario': False
        },
        {
            'chave': 'senha_requer_numero',
            'valor': 'true',
            'descricao': 'Senha deve conter número',
            'tipo': 'boolean',
            'categoria': 'seguranca',
            'editavel_usuario': False
        }
    ]

    for config_data in configuracoes_padrao:
        config_existente = Configuracao.query.filter_by(
            chave=config_data['chave']).first()
        if not config_existente:
            config = Configuracao(**config_data)
            db.session.add(config)

    try:
        db.session.commit()
        print("✅ Configurações padrão inicializadas")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Erro ao inicializar configurações: {e}")


@configuracoes_bp.route('/', methods=['GET'])
@token_required
def listar_configuracoes(current_user):
    """Lista configurações baseado no perfil do usuário"""
    try:
        if current_user.role == 'administrador':
            # Admin vê todas as configurações
            configuracoes = Configuracao.query.all()
        else:
            # Usuário comum vê apenas configurações editáveis
            configuracoes = Configuracao.query.filter_by(
                editavel_usuario=True).all()

        # Buscar configurações personalizadas do usuário
        configs_usuario = ConfiguracaoUsuario.query.filter_by(
            user_id=current_user.id).all()
        configs_usuario_dict = {
            config.chave: config.valor for config in configs_usuario}

        # Organizar por categoria
        resultado = {}
        for config in configuracoes:
            categoria = config.categoria
            if categoria not in resultado:
                resultado[categoria] = []

            config_dict = config.to_dict()
            # Sobrescrever com configuração personalizada do usuário se existir
            if config.chave in configs_usuario_dict:
                config_dict['valor'] = configs_usuario_dict[config.chave]
                config_dict['personalizada'] = True
            else:
                config_dict['personalizada'] = False

            resultado[categoria].append(config_dict)

        return jsonify({
            'configuracoes': resultado,
            'usuario_admin': current_user.role == 'administrador'
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@configuracoes_bp.route('/', methods=['PUT'])
@token_required
def atualizar_configuracoes(current_user):
    """Atualiza configurações"""
    try:
        data = request.get_json()
        configuracoes_para_atualizar = data.get('configuracoes', {})

        for categoria, configs in configuracoes_para_atualizar.items():
            for config_data in configs:
                chave = config_data.get('chave')
                novo_valor = config_data.get('valor')

                if not chave:
                    continue

                # Buscar configuração original
                config_original = Configuracao.query.filter_by(
                    chave=chave).first()
                if not config_original:
                    continue

                # Verificar permissões
                if current_user.role != 'administrador' and not config_original.editavel_usuario:
                    continue

                if current_user.role == 'administrador':
                    # Admin pode alterar configuração global
                    config_original.set_valor_tipado(novo_valor)
                else:
                    # Usuário comum cria/atualiza configuração personalizada
                    config_usuario = ConfiguracaoUsuario.query.filter_by(
                        user_id=current_user.id,
                        chave=chave
                    ).first()

                    if config_usuario:
                        config_usuario.valor = str(novo_valor)
                    else:
                        config_usuario = ConfiguracaoUsuario(
                            user_id=current_user.id,
                            chave=chave,
                            valor=str(novo_valor)
                        )
                        db.session.add(config_usuario)

        db.session.commit()
        return jsonify({'message': 'Configurações atualizadas com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@configuracoes_bp.route('/reset', methods=['POST'])
@token_required
@admin_required
def resetar_configuracoes(current_user):
    """Reseta configurações para valores padrão (apenas admin)"""
    try:
        # Deletar todas as configurações personalizadas de usuários
        ConfiguracaoUsuario.query.delete()

        # Resetar configurações globais para valores padrão
        inicializar_configuracoes_padrao()

        db.session.commit()
        return jsonify({'message': 'Configurações resetadas para valores padrão'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


@configuracoes_bp.route('/backup', methods=['POST'])
@token_required
@admin_required
def backup_configuracoes(current_user):
    """Cria backup das configurações (apenas admin)"""
    try:
        from datetime import datetime

        configuracoes = Configuracao.query.all()
        backup_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'configuracoes': [config.to_dict() for config in configuracoes]
        }

        return jsonify({
            'message': 'Backup criado com sucesso',
            'backup': backup_data
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


# Função para ser chamada na inicialização
def init_configuracoes():
    """Função para ser chamada na inicialização da aplicação"""
    try:
        inicializar_configuracoes_padrao()
    except Exception as e:
        print(f"❌ Erro ao inicializar configurações: {e}")
