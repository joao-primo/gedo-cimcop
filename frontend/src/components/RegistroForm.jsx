"use client"

import { useState, useEffect, useContext } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { X, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"

const RegistroForm = ({ isOpen, onClose, onSuccess, registro = null }) => {
  const { user } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Estados do formulário
  const [formData, setFormData] = useState({
    titulo: "",
    tipo_registro_id: "",
    data_registro: "",
    codigo_numero: "",
    descricao: "",
    obra_id: user?.role === "usuario_padrao" ? user.obra_id : "",
    classificacao_grupo: "",
    classificacao_subgrupo: "",
    classificacao_id: "",
  })

  const [arquivo, setArquivo] = useState(null)
  const [obras, setObras] = useState([])
  const [tiposRegistro, setTiposRegistro] = useState([])
  const [classificacoes, setClassificacoes] = useState([])
  const [gruposClassificacao, setGruposClassificacao] = useState([])
  const [subgruposClassificacao, setSubgruposClassificacao] = useState([])

  useEffect(() => {
    if (isOpen) {
      carregarDados()
      if (registro) {
        preencherFormulario(registro)
      } else {
        resetarFormulario()
      }
    }
  }, [isOpen, registro])

  useEffect(() => {
    // Atualizar subgrupos quando grupo muda
    if (formData.classificacao_grupo) {
      const subgrupos = classificacoes
        .filter((c) => c.grupo === formData.classificacao_grupo)
        .map((c) => c.subgrupo)
        .filter((value, index, self) => self.indexOf(value) === index)
      setSubgruposClassificacao(subgrupos)

      // Limpar subgrupo se não for válido para o novo grupo
      if (formData.classificacao_subgrupo && !subgrupos.includes(formData.classificacao_subgrupo)) {
        setFormData((prev) => ({ ...prev, classificacao_subgrupo: "", classificacao_id: "" }))
      }
    } else {
      setSubgruposClassificacao([])
      setFormData((prev) => ({ ...prev, classificacao_subgrupo: "", classificacao_id: "" }))
    }
  }, [formData.classificacao_grupo, classificacoes])

  useEffect(() => {
    // Atualizar ID da classificação quando grupo e subgrupo mudam
    if (formData.classificacao_grupo && formData.classificacao_subgrupo) {
      const classificacao = classificacoes.find(
        (c) => c.grupo === formData.classificacao_grupo && c.subgrupo === formData.classificacao_subgrupo,
      )
      if (classificacao) {
        setFormData((prev) => ({ ...prev, classificacao_id: classificacao.id }))
      }
    } else {
      setFormData((prev) => ({ ...prev, classificacao_id: "" }))
    }
  }, [formData.classificacao_grupo, formData.classificacao_subgrupo, classificacoes])

  const carregarDados = async () => {
    try {
      const token = localStorage.getItem("token")
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      // Carregar obras
      if (user?.role === "administrador") {
        const obrasResponse = await fetch("/api/obras", { headers })
        if (obrasResponse.ok) {
          const obrasData = await obrasResponse.json()
          setObras(obrasData.obras || [])
        }
      }

      // Carregar tipos de registro
      const tiposResponse = await fetch("/api/tipos-registro", { headers })
      if (tiposResponse.ok) {
        const tiposData = await tiposResponse.json()
        setTiposRegistro(tiposData.tipos_registro || [])
      }

      // Carregar classificações
      try {
        const classificacoesResponse = await fetch("/api/classificacoes", { headers })
        if (classificacoesResponse.ok) {
          const classificacoesData = await classificacoesResponse.json()
          setClassificacoes(classificacoesData.classificacoes || [])

          // Extrair grupos únicos
          const grupos = [...new Set(classificacoesData.classificacoes.map((c) => c.grupo))]
          setGruposClassificacao(grupos)
        }
      } catch (err) {
        console.warn("Classificações não disponíveis:", err)
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
      setError("Erro ao carregar dados do formulário")
    }
  }

  const preencherFormulario = (registro) => {
    setFormData({
      titulo: registro.titulo || "",
      tipo_registro_id: registro.tipo_registro_id || "",
      data_registro: registro.data_registro ? registro.data_registro.split("T")[0] : "",
      codigo_numero: registro.codigo_numero || "",
      descricao: registro.descricao || "",
      obra_id: registro.obra_id || (user?.role === "usuario_padrao" ? user.obra_id : ""),
      classificacao_grupo: registro.classificacao_grupo || "",
      classificacao_subgrupo: registro.classificacao_subgrupo || "",
      classificacao_id: registro.classificacao_id || "",
    })
  }

  const resetarFormulario = () => {
    setFormData({
      titulo: "",
      tipo_registro_id: "",
      data_registro: new Date().toISOString().split("T")[0],
      codigo_numero: "",
      descricao: "",
      obra_id: user?.role === "usuario_padrao" ? user.obra_id : "",
      classificacao_grupo: "",
      classificacao_subgrupo: "",
      classificacao_id: "",
    })
    setArquivo(null)
    setError("")
    setSuccess("")
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tamanho (16MB)
      if (file.size > 16 * 1024 * 1024) {
        setError("Arquivo muito grande. Máximo permitido: 16MB")
        return
      }

      // Validar tipo
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/png",
        "image/gif",
        "text/plain",
      ]

      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de arquivo não permitido")
        return
      }

      setArquivo(file)
      setError("")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Validações
      if (!formData.titulo.trim()) {
        throw new Error("Título é obrigatório")
      }
      if (!formData.tipo_registro_id) {
        throw new Error("Tipo de registro é obrigatório")
      }
      if (!formData.data_registro) {
        throw new Error("Data do registro é obrigatória")
      }
      if (!formData.descricao.trim()) {
        throw new Error("Descrição é obrigatória")
      }
      if (user?.role === "administrador" && !formData.obra_id) {
        throw new Error("Obra é obrigatória")
      }
      if (!formData.classificacao_grupo) {
        throw new Error("Classificação (grupo) é obrigatória")
      }
      if (!formData.classificacao_subgrupo) {
        throw new Error("Classificação (subgrupo) é obrigatória")
      }

      // Preparar FormData
      const submitData = new FormData()
      Object.keys(formData).forEach((key) => {
        if (formData[key]) {
          submitData.append(key, formData[key])
        }
      })

      if (arquivo) {
        submitData.append("anexo", arquivo)
      }

      // Enviar requisição
      const token = localStorage.getItem("token")
      const url = registro ? `/api/registros/${registro.id}` : "/api/registros"
      const method = registro ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(registro ? "Registro atualizado com sucesso!" : "Registro criado com sucesso!")
        setTimeout(() => {
          onSuccess && onSuccess()
          onClose()
        }, 1500)
      } else {
        throw new Error(result.message || "Erro ao salvar registro")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{registro ? "Editar Registro" : "Novo Registro"}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Título *</label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Registro */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Registro *</label>
                  <select
                    name="tipo_registro_id"
                    value={formData.tipo_registro_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecione um tipo</option>
                    {tiposRegistro.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data do Registro */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data do Registro *</label>
                  <input
                    type="date"
                    name="data_registro"
                    value={formData.data_registro}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Obra (apenas para admin) */}
                {user?.role === "administrador" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Obra *</label>
                    <select
                      name="obra_id"
                      value={formData.obra_id}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecione uma obra</option>
                      {obras.map((obra) => (
                        <option key={obra.id} value={obra.id}>
                          {obra.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Código/Número */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código/Número</label>
                  <input
                    type="text"
                    name="codigo_numero"
                    value={formData.codigo_numero}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Classificação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Classificação - Grupo *</label>
                  <select
                    name="classificacao_grupo"
                    value={formData.classificacao_grupo}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecione um grupo</option>
                    {gruposClassificacao.map((grupo) => (
                      <option key={grupo} value={grupo}>
                        {grupo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Classificação - Subgrupo *</label>
                  <select
                    name="classificacao_subgrupo"
                    value={formData.classificacao_subgrupo}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!formData.classificacao_grupo}
                  >
                    <option value="">Selecione um subgrupo</option>
                    {subgruposClassificacao.map((subgrupo) => (
                      <option key={subgrupo} value={subgrupo}>
                        {subgrupo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição *</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Upload de Arquivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Anexo</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Selecionar arquivo</span>
                        <input
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                        />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOC, XLS, IMG até 16MB</p>
                    {arquivo && (
                      <div className="flex items-center justify-center mt-2">
                        <FileText className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-green-600">{arquivo.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Salvando..." : registro ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistroForm
