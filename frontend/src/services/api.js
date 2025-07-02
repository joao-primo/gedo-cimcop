import axios from "axios"

// Configuração base do axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log("Fazendo requisição:", config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error("Erro na requisição:", error)
    return Promise.reject(error)
  },
)

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    console.log("Resposta recebida:", response.status, response.config.url)
    return response
  },
  (error) => {
    console.error("Erro na resposta:", error.response?.status, error.config?.url, error.response?.data)

    // Se token expirou, redirecionar para login
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    return Promise.reject(error)
  },
)

// APIs de Autenticação
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  forgotPassword: (email) => api.post("/forgot-password", { email }),
  resetPassword: (token, newPassword) => api.post("/reset-password", { token, new_password: newPassword }),
  changePassword: (currentPassword, newPassword) =>
    api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),
}

// APIs do Dashboard
export const dashboardAPI = {
  getEstatisticas: () => api.get("/dashboard/estatisticas"),
  getAtividadesRecentes: (limit = 10) => api.get(`/dashboard/atividades-recentes?limit=${limit}`),
  getTimeline: (dias = 30) => api.get(`/dashboard/timeline?dias=${dias}`),
}

// APIs de Pesquisa
export const pesquisaAPI = {
  getFiltros: () => api.get("/pesquisa/filtros"),
  pesquisar: (params) => api.get("/pesquisa/", { params }),
}

// APIs de Registros
export const registrosAPI = {
  listar: (params) => api.get("/registros/", { params }),
  criar: (data) => api.post("/registros/", data),
  obter: (id) => api.get(`/registros/${id}`),
  atualizar: (id, data) => api.put(`/registros/${id}`, data),
  deletar: (id) => api.delete(`/registros/${id}`),
  importarLote: (formData) =>
    api.post("/importacao/lote", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
}

// APIs de Obras
export const obrasAPI = {
  listar: () => api.get("/obras/"),
  criar: (data) => api.post("/obras/", data),
  obter: (id) => api.get(`/obras/${id}`),
  atualizar: (id, data) => api.put(`/obras/${id}`, data),
  deletar: (id) => api.delete(`/obras/${id}`),
}

// APIs de Usuários
export const usuariosAPI = {
  listar: () => api.get("/users/"),
  criar: (data) => api.post("/users/", data),
  obter: (id) => api.get(`/users/${id}`),
  atualizar: (id, data) => api.put(`/users/${id}`, data),
  deletar: (id) => api.delete(`/users/${id}`),
}

// APIs de Tipos de Registro
export const tiposRegistroAPI = {
  listar: () => api.get("/tipos-registro/"),
  criar: (data) => api.post("/tipos-registro/", data),
  obter: (id) => api.get(`/tipos-registro/${id}`),
  atualizar: (id, data) => api.put(`/tipos-registro/${id}`, data),
  deletar: (id) => api.delete(`/tipos-registro/${id}`),
}

// APIs de Configurações
export const configuracoesAPI = {
  listar: () => api.get("/configuracoes/"),
  atualizar: (data) => api.put("/configuracoes/", data),
}

// APIs de Workflow
export const workflowAPI = {
  listar: () => api.get("/workflow/"),
  criar: (data) => api.post("/workflow/", data),
  atualizar: (id, data) => api.put(`/workflow/${id}`, data),
  deletar: (id) => api.delete(`/workflow/${id}`),
}

// Export da instância principal para casos especiais
export default api
