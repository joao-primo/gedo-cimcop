import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import logging

logger = logging.getLogger(__name__)


def get_email_config():
    """Obter configurações de email"""
    return {
        'servidor': os.getenv('EMAIL_SERVIDOR', 'smtp.gmail.com'),
        'porta': int(os.getenv('EMAIL_PORTA', 587)),
        'usuario': os.getenv('EMAIL_USUARIO', ''),
        'senha': os.getenv('EMAIL_SENHA', ''),
        'use_tls': os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true',
        'from_email': os.getenv('EMAIL_FROM', 'noreply@gedo.com')
    }


def testar_configuracao_email():
    """Testar se as configurações de email estão corretas"""
    config = get_email_config()

    if not config['usuario'] or not config['senha']:
        return False, "Configurações de email não definidas (modo simulação)"

    try:
        server = smtplib.SMTP(config['servidor'], config['porta'])
        if config['use_tls']:
            server.starttls()
        server.login(config['usuario'], config['senha'])
        server.quit()
        return True, "Configuração de email OK"
    except Exception as e:
        return False, f"Erro na configuração de email: {str(e)}"


def enviar_email(destinatario, assunto, corpo_html, corpo_texto=None, anexos=None):
    """
    Enviar email

    Args:
        destinatario: Email do destinatário
        assunto: Assunto do email
        corpo_html: Corpo do email em HTML
        corpo_texto: Corpo do email em texto (opcional)
        anexos: Lista de caminhos de arquivos para anexar (opcional)

    Returns:
        tuple: (sucesso: bool, mensagem: str)
    """
    config = get_email_config()

    # Se não há configuração de email, simular envio
    if not config['usuario'] or not config['senha']:
        logger.info(f"📧 SIMULAÇÃO DE EMAIL:")
        logger.info(f"   Para: {destinatario}")
        logger.info(f"   Assunto: {assunto}")
        logger.info(f"   Corpo: {corpo_html[:100]}...")
        return True, "Email simulado com sucesso (configuração não definida)"

    try:
        # Criar mensagem
        msg = MIMEMultipart('alternative')
        msg['From'] = config['from_email']
        msg['To'] = destinatario
        msg['Subject'] = assunto

        # Adicionar corpo em texto
        if corpo_texto:
            part1 = MIMEText(corpo_texto, 'plain', 'utf-8')
            msg.attach(part1)

        # Adicionar corpo em HTML
        part2 = MIMEText(corpo_html, 'html', 'utf-8')
        msg.attach(part2)

        # Adicionar anexos se houver
        if anexos:
            for arquivo in anexos:
                if os.path.exists(arquivo):
                    with open(arquivo, "rb") as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())

                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {os.path.basename(arquivo)}'
                    )
                    msg.attach(part)

        # Conectar e enviar
        server = smtplib.SMTP(config['servidor'], config['porta'])
        if config['use_tls']:
            server.starttls()
        server.login(config['usuario'], config['senha'])

        text = msg.as_string()
        server.sendmail(config['from_email'], destinatario, text)
        server.quit()

        logger.info(f"✅ Email enviado com sucesso para {destinatario}")
        return True, "Email enviado com sucesso"

    except Exception as e:
        logger.error(f"❌ Erro ao enviar email: {str(e)}")
        return False, f"Erro ao enviar email: {str(e)}"


def enviar_email_reset_senha(email, token, nome_usuario=None):
    """
    Enviar email de reset de senha

    Args:
        email: Email do usuário
        token: Token de reset
        nome_usuario: Nome do usuário (opcional)

    Returns:
        tuple: (sucesso: bool, mensagem: str)
    """
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    reset_url = f"{frontend_url}/reset-password?token={token}"

    nome = nome_usuario or email.split('@')[0]

    # Template HTML do email
    corpo_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f9f9f9; }}
            .button {{ 
                display: inline-block; 
                background: #2563eb; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0;
            }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>GEDO CIMCOP</h1>
                <p>Sistema de Gerenciamento de Documentos</p>
            </div>
            <div class="content">
                <h2>Redefinição de Senha</h2>
                <p>Olá, {nome}!</p>
                <p>Você solicitou a redefinição de sua senha no sistema GEDO CIMCOP.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Redefinir Senha</a>
                </p>
                <p><strong>Importante:</strong></p>
                <ul>
                    <li>Este link é válido por 1 hora</li>
                    <li>Se você não solicitou esta redefinição, ignore este email</li>
                    <li>Por segurança, não compartilhe este link</li>
                </ul>
                <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; background: #eee; padding: 10px;">{reset_url}</p>
            </div>
            <div class="footer">
                <p>Este é um email automático, não responda.</p>
                <p>GEDO CIMCOP - Sistema de Gerenciamento de Documentos e Registros de Obras</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Versão em texto
    corpo_texto = f"""
    GEDO CIMCOP - Redefinição de Senha
    
    Olá, {nome}!
    
    Você solicitou a redefinição de sua senha no sistema GEDO CIMCOP.
    
    Acesse o link abaixo para criar uma nova senha:
    {reset_url}
    
    IMPORTANTE:
    - Este link é válido por 1 hora
    - Se você não solicitou esta redefinição, ignore este email
    - Por segurança, não compartilhe este link
    
    ---
    Este é um email automático, não responda.
    GEDO CIMCOP - Sistema de Gerenciamento de Documentos e Registros de Obras
    """

    return enviar_email(
        destinatario=email,
        assunto="GEDO CIMCOP - Redefinição de Senha",
        corpo_html=corpo_html,
        corpo_texto=corpo_texto
    )


def enviar_email_notificacao(destinatarios, assunto, mensagem, dados_registro=None):
    """
    Enviar email de notificação de workflow

    Args:
        destinatarios: Lista de emails
        assunto: Assunto do email
        mensagem: Mensagem do email
        dados_registro: Dados do registro (opcional)

    Returns:
        tuple: (sucesso: bool, mensagem: str)
    """
    if not isinstance(destinatarios, list):
        destinatarios = [destinatarios]

    # Template HTML
    corpo_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f9f9f9; }}
            .dados {{ background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>GEDO CIMCOP</h1>
                <p>Sistema de Gerenciamento de Documentos</p>
            </div>
            <div class="content">
                <h2>Notificação de Workflow</h2>
                <p>{mensagem}</p>
                
                {f'''
                <div class="dados">
                    <h3>Dados do Registro:</h3>
                    <p><strong>Número:</strong> {dados_registro.get("numero", "N/A")}</p>
                    <p><strong>Tipo:</strong> {dados_registro.get("tipo", "N/A")}</p>
                    <p><strong>Obra:</strong> {dados_registro.get("obra", "N/A")}</p>
                    <p><strong>Data:</strong> {dados_registro.get("data", "N/A")}</p>
                </div>
                ''' if dados_registro else ''}
            </div>
            <div class="footer">
                <p>Este é um email automático, não responda.</p>
                <p>GEDO CIMCOP - Sistema de Gerenciamento de Documentos e Registros de Obras</p>
            </div>
        </div>
    </body>
    </html>
    """

    resultados = []
    for destinatario in destinatarios:
        sucesso, msg = enviar_email(
            destinatario=destinatario,
            assunto=assunto,
            corpo_html=corpo_html,
            corpo_texto=mensagem
        )
        resultados.append((destinatario, sucesso, msg))

    sucessos = sum(1 for _, sucesso, _ in resultados if sucesso)
    total = len(resultados)

    if sucessos == total:
        return True, f"Emails enviados com sucesso para {total} destinatários"
    elif sucessos > 0:
        return True, f"Emails enviados para {sucessos} de {total} destinatários"
    else:
        return False, "Falha ao enviar emails para todos os destinatários"
