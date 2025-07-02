import re
import json
from datetime import datetime


class ValidationError(Exception):
    """Exceção personalizada para erros de validação"""
    pass


def validar_json_data(data, required_fields=None):
    """Valida se os dados JSON são válidos e contêm campos obrigatórios"""
    if not data:
        raise ValidationError("Dados não fornecidos")

    if not isinstance(data, dict):
        raise ValidationError("Formato de dados inválido")

    if required_fields:
        missing_fields = [
            field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            raise ValidationError(
                f"Campos obrigatórios ausentes: {', '.join(missing_fields)}")

    return True


def validar_email(email):
    """Valida formato de email"""
    if not email:
        raise ValidationError("Email é obrigatório")

    email = email.strip().lower()

    # Regex para validação de email
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(email_pattern, email):
        raise ValidationError("Formato de email inválido")

    if len(email) > 120:
        raise ValidationError("Email muito longo (máximo 120 caracteres)")

    return email


def validar_senha(senha):
    """Valida senha com critérios de segurança"""
    if not senha:
        raise ValidationError("Senha é obrigatória")

    if len(senha) < 6:
        raise ValidationError("Senha deve ter pelo menos 6 caracteres")

    if len(senha) > 128:
        raise ValidationError("Senha muito longa (máximo 128 caracteres)")

    # Verificar se contém pelo menos uma letra maiúscula
    if not re.search(r'[A-Z]', senha):
        raise ValidationError(
            "Senha deve conter pelo menos uma letra maiúscula")

    # Verificar se contém pelo menos uma letra minúscula
    if not re.search(r'[a-z]', senha):
        raise ValidationError(
            "Senha deve conter pelo menos uma letra minúscula")

    # Verificar se contém pelo menos um número
    if not re.search(r'\d', senha):
        raise ValidationError("Senha deve conter pelo menos um número")

    return senha


def validar_username(username):
    """Valida nome de usuário"""
    if not username:
        raise ValidationError("Nome de usuário é obrigatório")

    username = username.strip()

    if len(username) < 3:
        raise ValidationError(
            "Nome de usuário deve ter pelo menos 3 caracteres")

    if len(username) > 80:
        raise ValidationError(
            "Nome de usuário muito longo (máximo 80 caracteres)")

    # Permitir apenas letras, números, underscore e hífen
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        raise ValidationError(
            "Nome de usuário deve conter apenas letras, números, _ e -")

    return username


def validar_role(role):
    """Valida tipo de usuário"""
    roles_validos = ['administrador', 'usuario_padrao']

    if not role:
        return 'usuario_padrao'  # Valor padrão

    if role not in roles_validos:
        raise ValidationError(
            f"Tipo de usuário inválido. Valores aceitos: {', '.join(roles_validos)}")

    return role


def validar_texto(texto, nome_campo, min_length=1, max_length=255, required=True):
    """Valida campos de texto genéricos"""
    if not texto and required:
        raise ValidationError(f"{nome_campo} é obrigatório")

    if not texto:
        return texto

    texto = texto.strip()

    if len(texto) < min_length:
        raise ValidationError(
            f"{nome_campo} deve ter pelo menos {min_length} caracteres")

    if len(texto) > max_length:
        raise ValidationError(
            f"{nome_campo} muito longo (máximo {max_length} caracteres)")

    return texto


def validar_numero(numero, nome_campo, min_value=None, max_value=None, required=True):
    """Valida campos numéricos"""
    if numero is None and required:
        raise ValidationError(f"{nome_campo} é obrigatório")

    if numero is None:
        return numero

    try:
        numero = float(numero)
    except (ValueError, TypeError):
        raise ValidationError(f"{nome_campo} deve ser um número válido")

    if min_value is not None and numero < min_value:
        raise ValidationError(
            f"{nome_campo} deve ser maior ou igual a {min_value}")

    if max_value is not None and numero > max_value:
        raise ValidationError(
            f"{nome_campo} deve ser menor ou igual a {max_value}")

    return numero


def validar_data(data_str, nome_campo, required=True):
    """Valida campos de data"""
    if not data_str and required:
        raise ValidationError(f"{nome_campo} é obrigatória")

    if not data_str:
        return None

    try:
        # Tenta diferentes formatos de data
        formatos = ['%Y-%m-%d', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']

        for formato in formatos:
            try:
                return datetime.strptime(data_str, formato)
            except ValueError:
                continue

        raise ValueError("Formato não reconhecido")

    except ValueError:
        raise ValidationError(
            f"{nome_campo} deve estar em formato válido (YYYY-MM-DD ou DD/MM/YYYY)")


def validar_arquivo(arquivo, tipos_permitidos=None, tamanho_max=None):
    """Valida arquivos enviados"""
    if not arquivo:
        raise ValidationError("Arquivo é obrigatório")

    if not arquivo.filename:
        raise ValidationError("Nome do arquivo é obrigatório")

    # Verificar extensão
    if tipos_permitidos:
        extensao = arquivo.filename.rsplit('.', 1)[-1].lower()
        if extensao not in tipos_permitidos:
            raise ValidationError(
                f"Tipo de arquivo não permitido. Tipos aceitos: {', '.join(tipos_permitidos)}")

    # Verificar tamanho (se fornecido)
    if tamanho_max:
        arquivo.seek(0, 2)  # Vai para o final do arquivo
        tamanho = arquivo.tell()
        arquivo.seek(0)  # Volta para o início

        if tamanho > tamanho_max:
            tamanho_mb = tamanho_max / (1024 * 1024)
            raise ValidationError(
                f"Arquivo muito grande. Tamanho máximo: {tamanho_mb:.1f}MB")

    return arquivo


def sanitizar_filename(filename):
    """Remove caracteres perigosos do nome do arquivo"""
    if not filename:
        return filename

    # Remove caracteres especiais e espaços
    filename = re.sub(r'[^\w\s.-]', '', filename)
    filename = re.sub(r'[-\s]+', '-', filename)

    return filename.strip('.-')


def validar_url(url, nome_campo="URL", required=True):
    """Valida URLs"""
    if not url and required:
        raise ValidationError(f"{nome_campo} é obrigatória")

    if not url:
        return url

    url_pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w*))?)?$'

    if not re.match(url_pattern, url):
        raise ValidationError(f"{nome_campo} deve ser uma URL válida")

    return url


def validar_telefone(telefone, nome_campo="Telefone", required=True):
    """Valida números de telefone"""
    if not telefone and required:
        raise ValidationError(f"{nome_campo} é obrigatório")

    if not telefone:
        return telefone

    # Remove caracteres não numéricos
    telefone_limpo = re.sub(r'[^\d]', '', telefone)

    if len(telefone_limpo) < 10 or len(telefone_limpo) > 11:
        raise ValidationError(f"{nome_campo} deve ter 10 ou 11 dígitos")

    return telefone_limpo


def validar_cpf(cpf, required=True):
    """Valida CPF"""
    if not cpf and required:
        raise ValidationError("CPF é obrigatório")

    if not cpf:
        return cpf

    # Remove caracteres não numéricos
    cpf = re.sub(r'[^\d]', '', cpf)

    if len(cpf) != 11:
        raise ValidationError("CPF deve ter 11 dígitos")

    # Verifica se todos os dígitos são iguais
    if cpf == cpf[0] * 11:
        raise ValidationError("CPF inválido")

    # Validação do CPF
    def calcular_digito(cpf_parcial, peso_inicial):
        soma = sum(int(cpf_parcial[i]) * (peso_inicial - i)
                   for i in range(len(cpf_parcial)))
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto

    if int(cpf[9]) != calcular_digito(cpf[:9], 10):
        raise ValidationError("CPF inválido")

    if int(cpf[10]) != calcular_digito(cpf[:10], 11):
        raise ValidationError("CPF inválido")

    return cpf


def validar_cnpj(cnpj, required=True):
    """Valida CNPJ"""
    if not cnpj and required:
        raise ValidationError("CNPJ é obrigatório")

    if not cnpj:
        return cnpj

    # Remove caracteres não numéricos
    cnpj = re.sub(r'[^\d]', '', cnpj)

    if len(cnpj) != 14:
        raise ValidationError("CNPJ deve ter 14 dígitos")

    # Verifica se todos os dígitos são iguais
    if cnpj == cnpj[0] * 14:
        raise ValidationError("CNPJ inválido")

    # Validação do CNPJ
    def calcular_digito_cnpj(cnpj_parcial, pesos):
        soma = sum(int(cnpj_parcial[i]) * pesos[i]
                   for i in range(len(cnpj_parcial)))
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto

    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    if int(cnpj[12]) != calcular_digito_cnpj(cnpj[:12], pesos1):
        raise ValidationError("CNPJ inválido")

    if int(cnpj[13]) != calcular_digito_cnpj(cnpj[:13], pesos2):
        raise ValidationError("CNPJ inválido")

    return cnpj
