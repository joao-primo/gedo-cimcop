import axios from "axios"

// Configuração base do axios
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

// APIs específicas
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) => api.post("/auth/reset-password", { token, password }),
  changePassword: (data) => api.post("/auth/change-password", data),
}

export const userAPI = {
  getUsers: () => api.get("/users"),
  createUser: (userData) => api.post("/users", userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  changeUserPassword: (id, passwordData) => api.put(`/users/${id}/password`, passwordData),
}

export const obraAPI = {
  getObras: () => api.get("/obras"),
  createObra: (obraData) => api.post("/obras", obraData),
  updateObra: (id, obraData) => api.put(`/obras/${id}`, obraData),
  deleteObra: (id) => api.delete(`/obras/${id}`),
  getObra: (id) => api.get(`/obras/${id}`),
}

export const tipoRegistroAPI = {
  getTipos: () => api.get("/tipos-registro"),
  createTipo: (tipoData) => api.post("/tipos-registro", tipoData),
  updateTipo: (id, tipoData) => api.put(`/tipos-registro/${id}`, tipoData),
  deleteTipo: (id) => api.delete(`/tipos-registro/${id}`),
}

export const classificacaoAPI = {
  getClassificacoes: () => api.get("/classificacoes"),
  createClassificacao: (classificacaoData) => api.post("/classificacoes", classificacaoData),
  updateClassificacao: (id, classificacaoData) => api.put(`/classificacoes/${id}`, classificacaoData),
  deleteClassificacao: (id) => api.delete(`/classificacoes/${id}`),
  getGrupos: () => api.get("/classificacoes/grupos"),
  getSubgrupos: (grupo) => api.get(`/classificacoes/subgrupos/${grupo}`),
}

export const registroAPI = {
  getRegistros: (params = {}) => {
    const queryString = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
        queryString.append(key, params[key])
      }
    })
    return api.get(`/registros?${queryString.toString()}`)
  },
  createRegistro: (registroData) => api.post("/registros", registroData),
  updateRegistro: (id, registroData) => api.put(`/registros/${id}`, registroData),
  deleteRegistro: (id) => api.delete(`/registros/${id}`),
  getRegistro: (id) => api.get(`/registros/${id}`),
  uploadAnexo: (id, formData) =>
    api.post(`/registros/${id}/anexo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  downloadAnexo: (id) => api.get(`/registros/${id}/anexo`, { responseType: "blob" }),
  deleteAnexo: (id) => api.delete(`/registros/${id}/anexo`),
}

export const pesquisaAPI = {
  pesquisar: (params = {}) => {
    const queryString = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
        if (Array.isArray(params[key])) {
          params[key].forEach((value) => queryString.append(key, value))
        } else {
          queryString.append(key, params[key])
        }
      }
    })
    return api.get(`/pesquisa?${queryString.toString()}`)
  },
  getFiltros: () => api.get("/pesquisa/filtros"),
  exportar: (params = {}) => {
    const queryString = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
        if (Array.isArray(params[key])) {
          params[key].forEach((value) => queryString.append(key, value))
        } else {
          queryString.append(key, params[key])
        }
      }
    })
    return api.get(`/pesquisa/exportar?${queryString.toString()}`, { responseType: "blob" })
  },
}

// CORRIGIDO: Dashboard API com URLs corretas
export const dashboardAPI = {
  getEstatisticas: (params = {}) => {
    const queryString = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
        queryString.append(key, params[key])
      }
    })
    const url = queryString.toString() ? `/dashboard/estatisticas?${queryString.toString()}` : "/dashboard/estatisticas"
    return api.get(url)
  },
  getAtividadesRecentes: (limit = 5, obraId = null) => {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (obraId) {
      params.append("obra_id", obraId.toString())
    }
    return api.get(`/dashboard/atividades-recentes?${params.toString()}`)
  },
  getTimeline: (dias = 30, obraId = null) => {
    const params = new URLSearchParams()
    if (obraId) {
      params.append("obra_id", obraId.toString())
    }
    const url = params.toString() ? `/dashboard/timeline/${dias}?${params.toString()}` : `/dashboard/timeline/${dias}`
    return api.get(url)
  },
  getResumoObra: (obraId) => api.get(`/dashboard/resumo-obra/${obraId}`),
  getResumoMensal: (obraId = null) => {
    const params = new URLSearchParams()
    if (obraId) {
      params.append("obra_id", obraId.toString())
    }
    const url = params.toString() ? `/dashboard/resumo-mensal?${params.toString()}` : "/dashboard/resumo-mensal"
    return api.get(url)
  },
}

export const configuracaoAPI = {
  getConfiguracoes: () => api.get("/configuracoes"),
  updateConfiguracao: (chave, valor) => api.put("/configuracoes", { chave, valor }),
  getConfiguracao: (chave) => api.get(`/configuracoes/${chave}`),
}

export const workflowAPI = {
  getWorkflows: () => api.get("/workflow"),
  createWorkflow: (workflowData) => api.post("/workflow", workflowData),
  updateWorkflow: (id, workflowData) => api.put(`/workflow/${id}`, workflowData),
  deleteWorkflow: (id) => api.delete(`/workflow/${id}`),
  getWorkflow: (id) => api.get(`/workflow/${id}`),
  testWorkflow: (id) => api.post(`/workflow/${id}/test`),
}

export const relatorioAPI = {
  getRelatorios: () => api.get("/relatorios"),
  gerarRelatorio: (tipo, params = {}) => {
    const queryString = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
        queryString.append(key, params[key])
      }
    })
    return api.get(`/relatorios/${tipo}?${queryString.toString()}`, { responseType: "blob" })
  },
  getEstatisticasRelatorio: (params = {}) => {
    const queryString = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
        queryString.append(key, params[key])
      }
    })
    return api.get(`/relatorios/estatisticas?${queryString.toString()}`)
  },
}

export const importacaoAPI = {
  downloadTemplate: () => api.get("/importacao/template", { responseType: "blob" }),
  processarPlanilha: (formData) =>
    api.post("/importacao/processar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadAnexo: (formData) =>
    api.post("/importacao/upload-anexo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  finalizarImportacao: (dados) => api.post("/importacao/finalizar", dados),
}

export const auditAPI = {
  getLogs: (params = {}) => {
    const queryString = new URLSearchParams()
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
        queryString.append(key, params[key])
      }
    })
    return api.get(`/audit/logs?${queryString.toString()}`)
  },
  getLog: (id) => api.get(`/audit/logs/${id}`),
}

export const backupAPI = {
  criarBackup: () => api.post("/backup/criar"),
  listarBackups: () => api.get("/backup/listar"),
  restaurarBackup: (filename) => api.post("/backup/restaurar", { filename }),
  downloadBackup: (filename) => api.get(`/backup/download/${filename}`, { responseType: "blob" }),
  deleteBackup: (filename) => api.delete(`/backup/delete/${filename}`),
}

export default api
