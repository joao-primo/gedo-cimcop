// Utilitários para padronização de texto

export const formatters = {
  // Padronizar nomes (Primeira letra maiúscula em cada palavra)
  padronizarNome: (texto) => {
    if (!texto) return ""
    return texto
      .toLowerCase()
      .split(" ")
      .map((palavra) => {
        if (palavra.length <= 2) return palavra.toLowerCase() // artigos: de, da, do, etc.
        return palavra.charAt(0).toUpperCase() + palavra.slice(1)
      })
      .join(" ")
      .trim()
  },

  // Padronizar códigos (MAIÚSCULO com formato específico)
  padronizarCodigo: (texto, prefixo = "") => {
    if (!texto) return ""
    let codigo = texto.toUpperCase().replace(/[^A-Z0-9-]/g, "")
    if (prefixo && !codigo.startsWith(prefixo)) {
      codigo = `${prefixo}-${codigo}`
    }
    return codigo
  },

  // Padronizar email (minúsculo)
  padronizarEmail: (email) => {
    if (!email) return ""
    return email.toLowerCase().trim()
  },

  // Padronizar telefone
  padronizarTelefone: (telefone) => {
    if (!telefone) return ""
    const numeros = telefone.replace(/\D/g, "")
    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
    }
    if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
    }
    return telefone
  },

  // Capitalizar primeira letra
  capitalize: (texto) => {
    if (!texto) return ""
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
  },

  // Remover acentos e caracteres especiais para códigos
  removerAcentos: (texto) => {
    if (!texto) return ""
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
  },
}

// Validadores
export const validators = {
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  },

  telefone: (telefone) => {
    const numeros = telefone.replace(/\D/g, "")
    return numeros.length >= 10 && numeros.length <= 11
  },

  codigo: (codigo) => {
    return codigo && codigo.length >= 3
  },
}
