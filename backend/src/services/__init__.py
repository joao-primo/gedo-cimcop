"""
Serviços do sistema GEDO CIMCOP

Este módulo contém todos os serviços auxiliares do sistema:
- Email service: Envio de emails e notificações
- Security service: Funções de segurança e validação
- File service: Manipulação de arquivos
- Backup service: Backup e restore de dados
"""

from .email_service import (
    enviar_email,
    enviar_email_reset_senha,
    enviar_email_notificacao,
    testar_configuracao_email,
    get_email_config
)

__all__ = [
    'enviar_email',
    'enviar_email_reset_senha',
    'enviar_email_notificacao',
    'testar_configuracao_email',
    'get_email_config'
]
