import axios from "axios"

// CORREÇÃO CRÍTICA: Configuração mais robusta para resolver Network Error
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    // ADICIONADO: Headers para evitar problemas de CORS preflight
    Accept: "application/json",
  },
})

// CORREÇÃO: Função para testar conectividade antes de usar CSRF
let csrfToken = null
let connectionTested = false

export async function testConnection() {
  try {
    console.log("🔍 Testando conectividade com:", import.meta.env.VITE_API_URL)
    const response = await api.get("/api/health", { timeout: 10000 })
    console.log("✅ Conectividade OK:", response.data)
    connectionTested = true
    return true
  } catch (error) {
    console.error("❌ Falha na conectividade:", error.message)
    console.error("🔧 URL configurada:", import.meta.env.VITE_API_URL)
    console.error("🔧 Erro completo:", error)
    return false
  }
}

export async function fetchCsrfToken() {
  try {
    // ADICIONADO: Testar conectividade primeiro
    if (!connectionTested) {
      const connected = await testConnection()
      if (!connected) {
        throw new Error("Não foi possível conectar ao servidor")
      }
    }

    console.log("🔐 Buscando CSRF token...")
    const res = await api.get("/api/csrf-token")
    csrfToken = res.data.csrf_token
    console.log("✅ CSRF token obtido")
    return csrfToken
  } catch (err) {
    console.error("❌ Erro ao buscar CSRF token:", err)

    // ADICIONADO: Diagnóstico mais detalhado
    if (err.code === "ERR_NETWORK") {
      console.error("🚨 NETWORK ERROR - Possíveis causas:")
      console.error("   1. Backend não está rodando")
      console.error("   2. URL incorreta:", import.meta.env.VITE_API_URL)
      console.error("   3. Problema de CORS")
      console.error("   4. Firewall/Proxy bloqueando")
    }

    return null
  }
}

// CORREÇÃO: Interceptor mais robusto com melhor tratamento de erros
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Adicionar CSRF apenas em métodos mutáveis
    const mutating = ["post", "put", "patch", "delete"]
    if (mutating.includes(config.method)) {
      if (!csrfToken) {
        await fetchCsrfToken()
      }
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken
      }
    }

    console.log("📤 Requisição:", config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error("❌ Erro na configuração da requisição:", error)
    return Promise.reject(error)
  },
)

// CORREÇÃO: Interceptor de resposta com diagnóstico melhorado
api.interceptors.response.use(
  (response) => {
    console.log("📥 Resposta:", response.status, response.config.url)
    return response
  },
  (error) => {
    console.error("❌ Erro na resposta:", error.response?.status, error.config?.url, error.response?.data)

    // ADICIONADO: Diagnóstico específico para Network Error
    if (error.code === "ERR_NETWORK") {
      console.error("🚨 NETWORK ERROR DETECTADO:")
      console.error("   URL tentada:", error.config?.url)
      console.error("   Base URL:", error.config?.baseURL)
      console.error("   Método:", error.config?.method)
      console.error("   Headers:", error.config?.headers)

      // Tentar diagnosticar a causa
      if (error.config?.url?.includes("undefined")) {
        console.error("   🔍 CAUSA PROVÁVEL: URL contém 'undefined'")
      }

      if (!import.meta.env.VITE_API_URL) {
        console.error("   🔍 CAUSA PROVÁVEL: VITE_API_URL não está definida")
      }
    }

    // Se token expirou, redirecionar para login
    if (error.response?.status === 401 && error.config?.url && !error.config.url.includes("/auth/login")) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    return Promise.reject(error)
  },
)

// APIs de Autenticação
export const authAPI = {
  login: async (email, password) => {
    try {
      console.log("🔐 Tentando login...")
      const response = await api.post("/api/auth/login", { email, password })
      console.log("✅ Login bem-sucedido")
      return response
    } catch (error) {
      console.error("❌ Erro no login:", error)
      throw error
    }
  },
  me: () => api.get("/api/auth/me"),
  logout: () => api.post("/api/auth/logout"),
  forgotPassword: (email) => api.post("/api/forgot-password", { email }),
  resetPassword: (token, newPassword) => api.post("/api/reset-password", { token, password: newPassword }),
  changePassword: (data) => api.post("/api/auth/change-password", data),
  getPasswordStatus: () => api.get("/api/auth/password-status"),
}

// APIs do Dashboard
export const dashboardAPI = {
  getEstatisticas: (params = {}) => api.get("/api/dashboard/estatisticas", { params }),
  getAtividadesRecentes: (limit = 10, obra_id = null) =>
    api.get(
      `/api/dashboard/atividades-recentes?limit=${limit}${obra_id && obra_id !== "todas" ? `&obra_id=${obra_id}` : ""}`,
    ),
  getTimeline: (dias = 30, obra_id = null) => {
    let url = `/api/dashboard/timeline/${dias}`
    if (obra_id && obra_id !== "todas") {
      url += `?obra_id=${obra_id}`
    }
    return api.get(url)
  },
}

// APIs de Pesquisa
export const pesquisaAPI = {
  getFiltros: () => api.get("/api/pesquisa/filtros"),
  pesquisar: (params) => api.get("/api/pesquisa/", { params }),
  exportar: (filtros) => api.post("/api/pesquisa/exportar", filtros, { responseType: "blob" }),
  visualizar: (id) => api.get(`/api/pesquisa/${id}/visualizar`),
}

// APIs de Registros
export const registrosAPI = {
  listar: (params) => api.get("/api/registros/", { params }),
  criar: (data) => {
    return api.post("/api/registros/", data, {
      headers: {
        "Content-Type": undefined,
      },
    })
  },
  obter: (id) => api.get(`/api/registros/${id}`),
  atualizar: (id, data) => api.put(`/api/registros/${id}`, data),
  deletar: (id) => api.delete(`/api/registros/${id}`),
  downloadAnexo: async (id, nomeOriginal = null) => {
    try {
      console.log("🔽 Baixando arquivo via backend proxy:", `/api/registros/${id}/download`)

      const response = await api.get(`/api/registros/${id}/download`, {
        responseType: "blob",
        timeout: 60000,
      })

      const contentDisposition = response.headers["content-disposition"]
      let filename = nomeOriginal || `anexo_${id}`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch) {
          const extractedFilename = filenameMatch[1].replace(/['"]/g, "")
          if (extractedFilename && extractedFilename !== "null" && extractedFilename !== "undefined") {
            filename = extractedFilename
          }
        }
      }

      if (!filename.includes(".")) {
        const contentType = response.headers["content-type"]
        const extensionMap = {
          "application/pdf": ".pdf",
          "application/msword": ".doc",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
          "application/vnd.ms-excel": ".xls",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
          "image/png": ".png",
          "image/jpeg": ".jpg",
          "image/gif": ".gif",
          "text/plain": ".txt",
        }

        if (contentType && extensionMap[contentType]) {
          filename += extensionMap[contentType]
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      console.log("✅ Download concluído:", filename)
      return { success: true, filename }
    } catch (error) {
      console.error("❌ Erro ao baixar arquivo:", error)

      if (error.response?.status === 404) {
        throw new Error("Arquivo não encontrado")
      } else if (error.response?.status === 403) {
        throw new Error("Acesso negado ao arquivo")
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Timeout no download - arquivo muito grande")
      } else {
        throw new Error("Erro ao baixar arquivo")
      }
    }
  },
  importarLote: (formData) =>
    api.post("/api/importacao/lote", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
}

// APIs de Obras
export const obrasAPI = {
  listar: () => api.get("/api/obras/"),
  criar: (data) => api.post("/api/obras/", data),
  obter: (id) => api.get(`/api/obras/${id}`),
  atualizar: (id, data) => api.put(`/api/obras/${id}`, data),
  deletar: (id) => api.delete(`/api/obras/${id}`),
}

// APIs de Usuários
export const usuariosAPI = {
  listar: () => api.get("/api/users/"),
  criar: (data) => api.post("/api/users/", data),
  obter: (id) => api.get(`/api/users/${id}`),
  atualizar: (id, data) => api.put(`/api/users/${id}`, data),
  deletar: (id) => api.delete(`/api/users/${id}`),
}

// APIs de Tipos de Registro
export const tiposRegistroAPI = {
  listar: () => api.get("/api/tipos-registro/"),
  listarTodos: () => api.get("/api/tipos-registro/all"),
  criar: (data) => api.post("/api/tipos-registro/", data),
  obter: (id) => api.get(`/api/tipos-registro/${id}`),
  atualizar: (id, data) => api.put(`/api/tipos-registro/${id}`, data),
  deletar: (id) => api.delete(`/api/tipos-registro/${id}`),
}

// APIs de Classificações
export const classificacoesAPI = {
  listar: () => api.get("/api/classificacoes/"),
  grupos: () => api.get("/api/classificacoes/grupos"),
  subgrupos: (grupo) => api.get(`/api/classificacoes/subgrupos/${encodeURIComponent(grupo)}`),
  criar: (data) => api.post("/api/classificacoes/", data),
  atualizar: (id, data) => api.put(`/api/classificacoes/${id}`, data),
  deletar: (id) => api.delete(`/api/classificacoes/${id}`),
}

// APIs de Configurações
export const configuracoesAPI = {
  get: () => api.get("/api/configuracoes/"),
  save: (data) => api.post("/api/configuracoes/", data),
  backup: () => api.post("/api/configuracoes/backup"),
  reset: () => api.post("/api/configuracoes/reset"),
}

// APIs de Workflow
export const workflowAPI = {
  listar: () => api.get("/api/workflow/"),
  criar: (data) => api.post("/api/workflow/", data),
  atualizar: (id, data) => api.put(`/api/workflow/${id}`, data),
  deletar: (id) => api.delete(`/api/workflow/${id}`),
}

export default api
