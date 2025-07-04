"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { registrosAPI, obrasAPI, tiposRegistroAPI } from "../services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Upload, AlertTriangle, CheckCircle, Building2, FileType, FolderTree } from "lucide-react"
import { toast } from "sonner"

// ✅ NOVO: Sistema de Classificação Hierárquico
const CLASSIFICACOES = {
  "1. Documentos Contratuais": [
    "1.1 Contratos e Aditivos",
    "1.2 Termos de Referência",
    "1.3 Editais e Propostas",
    "1.4 Garantias e Seguros",
  ],
  "2. Documentos Técnicos": [
    "2.1 Projetos Executivos",
    "2.2 Especificações Técnicas",
    "2.3 Memoriais Descritivos",
    "2.4 Planilhas Orçamentárias",
  ],
  "3. Licenças e Autorizações": [
    "3.1 Licenças Ambientais",
    "3.2 Alvarás e Permissões",
    "3.3 ARTs e RRTs",
    "3.4 Aprovações de Órgãos",
  ],
  "4. Controle de Execução": [
    "4.1 Cronogramas",
    "4.2 Medições e Faturamento",
    "4.3 Diários de Obra (RDO)",
    "4.4 Relatórios de Progresso",
  ],
  "5. Qualidade e Fiscalização": [
    "5.1 Ensaios e Testes",
    "5.2 Relatórios de Fiscalização",
    "5.3 Não Conformidades",
    "5.4 Ações Corretivas",
  ],
  "6. Correspondências": [
    "6.1 Ofícios e Memorandos",
    "6.2 E-mails Oficiais",
    "6.3 Atas de Reunião",
    "6.4 Notificações",
  ],
  "7. Segurança do Trabalho": [
    "7.1 PCMAT e PPRA",
    "7.2 Treinamentos",
    "7.3 Relatórios de Acidentes",
    "7.4 EPIs e EPCs",
  ],
  "8. Entrega e Encerramento": ["8.1 Termos de Entrega", "8.2 As Built", "8.3 Manuais e Garantias", "8.4 Habite-se"],
}

const RegistroForm = ({ onSuccess, registroParaEdicao = null }) => {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState([])
  const [tiposRegistro, setTiposRegistro] = useState([])
  const [loadingDados, setLoadingDados] = useState(true)
  const [grupoSelecionado, setGrupoSelecionado] = useState("")
  const [grupoExpandido, setGrupoExpandido] = useState(null)

  const [formData, setFormData] = useState({
    titulo: "",
    tipo_registro: "",
    tipo_registro_id: "",
    descricao: "",
    codigo_numero: "",
    data_registro: new Date().toISOString().split("T")[0],
    obra_id: user?.obra_id || "",
    // ✅ NOVO: Campos de classificação
    classificacao_grupo: "",
    classificacao_subgrupo: "",
  })

  const [arquivo, setArquivo] = useState(null)
  const [errors, setErrors] = useState({})

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoadingDados(true)

        const promises = [tiposRegistroAPI.listar()]

        // Carregar obras apenas para admin
        if (isAdmin()) {
          promises.push(obrasAPI.listar())
        }

        const responses = await Promise.all(promises)

        setTiposRegistro(responses[0].data.tipos_registro || [])

        if (isAdmin() && responses[1]) {
          setObras(responses[1].data.obras || [])
        }

        console.log("Dados carregados:", {
          tiposRegistro: responses[0].data.tipos_registro?.length || 0,
          obras: isAdmin() && responses[1] ? responses[1].data.obras?.length || 0 : "N/A (usuário padrão)",
        })
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast.error("Erro ao carregar dados do formulário")
      } finally {
        setLoadingDados(false)
      }
    }

    if (user) {
      carregarDados()
    }
  }, [user, isAdmin])

  // Preencher formulário para edição
  useEffect(() => {
    if (registroParaEdicao) {
      console.log("Preenchendo formulário para edição:", registroParaEdicao)

      setFormData({
        titulo: registroParaEdicao.titulo || "",
        tipo_registro: registroParaEdicao.tipo_registro || "",
        tipo_registro_id: registroParaEdicao.tipo_registro_id?.toString() || "",
        descricao: registroParaEdicao.descricao || "",
        codigo_numero: registroParaEdicao.codigo_numero || "",
        data_registro: registroParaEdicao.data_registro
          ? new Date(registroParaEdicao.data_registro).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        obra_id: registroParaEdicao.obra_id?.toString() || user?.obra_id?.toString() || "",
        // ✅ NOVO: Preencher classificação
        classificacao_grupo: registroParaEdicao.classificacao_grupo || "",
        classificacao_subgrupo: registroParaEdicao.classificacao_subgrupo || "",
      })

      // ✅ NOVO: Definir grupo selecionado se há classificação
      if (registroParaEdicao.classificacao_grupo) {
        setGrupoSelecionado(registroParaEdicao.classificacao_grupo)
      }
    }
  }, [registroParaEdicao, user])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }))
    }
  }

  const handleArquivoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tamanho (16MB)
      if (file.size > 16 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo permitido: 16MB")
        e.target.value = ""
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
        toast.error("Tipo de arquivo não permitido")
        e.target.value = ""
        return
      }

      setArquivo(file)
      console.log("Arquivo selecionado:", {
        name: file.name,
        size: file.size,
        type: file.type,
      })
    }
  }

  // ✅ NOVO: Handlers para classificação hierárquica
  const handleGrupoSelect = (grupo) => {
    setGrupoSelecionado(grupo)
    setFormData((prev) => ({
      ...prev,
      classificacao_grupo: grupo,
      classificacao_subgrupo: "", // Limpar subgrupo quando mudar grupo
    }))
    setGrupoExpandido(grupo)
  }

  const handleSubgrupoSelect = (subgrupo) => {
    setFormData((prev) => ({
      ...prev,
      classificacao_subgrupo: subgrupo,
    }))
  }

  const validarFormulario = () => {
    const novosErrors = {}

    if (!formData.titulo.trim()) {
      novosErrors.titulo = "Título é obrigatório"
    }

    if (!formData.tipo_registro.trim()) {
      novosErrors.tipo_registro = "Tipo de registro é obrigatório"
    }

    if (!formData.tipo_registro_id) {
      novosErrors.tipo_registro_id = "Tipo de registro específico é obrigatório"
    }

    if (!formData.descricao.trim()) {
      novosErrors.descricao = "Descrição é obrigatória"
    }

    if (!formData.data_registro) {
      novosErrors.data_registro = "Data do registro é obrigatória"
    }

    if (isAdmin() && !formData.obra_id) {
      novosErrors.obra_id = "Obra é obrigatória"
    }

    // ✅ NOVO: Validar classificação
    if (!formData.classificacao_grupo) {
      novosErrors.classificacao_grupo = "Grupo de classificação é obrigatório"
    }

    if (!formData.classificacao_subgrupo) {
      novosErrors.classificacao_subgrupo = "Subgrupo de classificação é obrigatório"
    }

    setErrors(novosErrors)
    return Object.keys(novosErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validarFormulario()) {
      toast.error("Por favor, corrija os erros no formulário")
      return
    }

    try {
      setLoading(true)

      const formDataToSend = new FormData()

      // Adicionar todos os campos do formulário
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== "") {
          formDataToSend.append(key, formData[key])
        }
      })

      // Adicionar arquivo se selecionado
      if (arquivo) {
        formDataToSend.append("anexo", arquivo)
      }

      console.log("Enviando dados:", {
        ...formData,
        arquivo: arquivo ? { name: arquivo.name, size: arquivo.size } : null,
      })

      let response
      if (registroParaEdicao) {
        response = await registrosAPI.atualizar(registroParaEdicao.id, formDataToSend)
        toast.success("Registro atualizado com sucesso!")
      } else {
        response = await registrosAPI.criar(formDataToSend)
        toast.success("Registro criado com sucesso!")
      }

      console.log("Resposta da API:", response.data)

      // Limpar formulário apenas se for criação
      if (!registroParaEdicao) {
        setFormData({
          titulo: "",
          tipo_registro: "",
          tipo_registro_id: "",
          descricao: "",
          codigo_numero: "",
          data_registro: new Date().toISOString().split("T")[0],
          obra_id: user?.obra_id || "",
          classificacao_grupo: "",
          classificacao_subgrupo: "",
        })
        setArquivo(null)
        setGrupoSelecionado("")
        setGrupoExpandido(null)

        // Limpar input de arquivo
        const fileInput = document.querySelector('input[type="file"]')
        if (fileInput) {
          fileInput.value = ""
        }
      }

      // Chamar callback de sucesso
      if (onSuccess) {
        onSuccess(response.data.registro)
      }
    } catch (error) {
      console.error("Erro ao salvar registro:", error)

      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error(registroParaEdicao ? "Erro ao atualizar registro" : "Erro ao criar registro")
      }
    } finally {
      setLoading(false)
    }
  }

  if (loadingDados) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Carregando formulário...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          {registroParaEdicao ? "Editar Registro" : "Novo Registro"}
        </CardTitle>
        <CardDescription>
          {registroParaEdicao
            ? "Atualize as informações do registro"
            : "Preencha as informações para criar um novo registro"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-gray-600" />
              <h3 className="text-lg font-semibold">Informações Básicas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => handleInputChange("titulo", e.target.value)}
                  placeholder="Digite o título do registro"
                  className={errors.titulo ? "border-red-500" : ""}
                />
                {errors.titulo && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.titulo}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo_numero">Código/Número</Label>
                <Input
                  id="codigo_numero"
                  value={formData.codigo_numero}
                  onChange={(e) => handleInputChange("codigo_numero", e.target.value)}
                  placeholder="Ex: DOC-001, REL-2024-01"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_registro">Tipo de Registro *</Label>
                <Select
                  value={formData.tipo_registro}
                  onValueChange={(value) => handleInputChange("tipo_registro", value)}
                >
                  <SelectTrigger className={errors.tipo_registro ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposRegistro.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.nome}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo_registro && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.tipo_registro}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_registro_id">Tipo Específico *</Label>
                <Select
                  value={formData.tipo_registro_id}
                  onValueChange={(value) => handleInputChange("tipo_registro_id", value)}
                >
                  <SelectTrigger className={errors.tipo_registro_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione o tipo específico" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposRegistro.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nome}
                        {tipo.descricao && <span className="text-xs text-gray-500 ml-2">- {tipo.descricao}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo_registro_id && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.tipo_registro_id}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_registro">Data do Registro *</Label>
                <Input
                  id="data_registro"
                  type="date"
                  value={formData.data_registro}
                  onChange={(e) => handleInputChange("data_registro", e.target.value)}
                  className={errors.data_registro ? "border-red-500" : ""}
                />
                {errors.data_registro && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.data_registro}
                  </p>
                )}
              </div>

              {isAdmin() && (
                <div className="space-y-2">
                  <Label htmlFor="obra_id">Obra *</Label>
                  <Select value={formData.obra_id} onValueChange={(value) => handleInputChange("obra_id", value)}>
                    <SelectTrigger className={errors.obra_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione a obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {obras.map((obra) => (
                        <SelectItem key={obra.id} value={obra.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {obra.nome}
                            {obra.codigo && (
                              <Badge variant="secondary" className="text-xs">
                                {obra.codigo}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.obra_id && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.obra_id}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* ✅ NOVO: Seção de Classificação Hierárquica */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FolderTree className="h-4 w-4 text-emerald-600" />
              <h3 className="text-lg font-semibold">Classificação Hierárquica</h3>
            </div>

            {/* Seleção de Grupo */}
            <div className="space-y-2">
              <Label>Grupo de Classificação *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.keys(CLASSIFICACOES).map((grupo) => (
                  <div
                    key={grupo}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      grupoSelecionado === grupo
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleGrupoSelect(grupo)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{grupo}</span>
                      {grupoSelecionado === grupo && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                    </div>
                  </div>
                ))}
              </div>
              {errors.classificacao_grupo && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.classificacao_grupo}
                </p>
              )}
            </div>

            {/* Seleção de Subgrupo */}
            {grupoSelecionado && (
              <div className="space-y-2">
                <Label>Subgrupo de Classificação *</Label>
                <div className="grid grid-cols-1 gap-2">
                  {CLASSIFICACOES[grupoSelecionado].map((subgrupo) => (
                    <div
                      key={subgrupo}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        formData.classificacao_subgrupo === subgrupo
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleSubgrupoSelect(subgrupo)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{subgrupo}</span>
                        {formData.classificacao_subgrupo === subgrupo && (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.classificacao_subgrupo && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.classificacao_subgrupo}
                  </p>
                )}
              </div>
            )}

            {/* Resumo da Classificação */}
            {formData.classificacao_grupo && formData.classificacao_subgrupo && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <FolderTree className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  <strong>Classificação selecionada:</strong>
                  <br />
                  {formData.classificacao_grupo} → {formData.classificacao_subgrupo}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange("descricao", e.target.value)}
              placeholder="Descreva detalhadamente o conteúdo do registro..."
              rows={4}
              className={errors.descricao ? "border-red-500" : ""}
            />
            {errors.descricao && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.descricao}
              </p>
            )}
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <Label htmlFor="anexo">Anexo</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <Label htmlFor="anexo" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Clique para selecionar um arquivo
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">PDF, DOC, XLS, IMG até 16MB</span>
                  </Label>
                  <Input
                    id="anexo"
                    type="file"
                    onChange={handleArquivoChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                  />
                </div>
              </div>
            </div>
            {arquivo && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <FileType className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">{arquivo.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                </Badge>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {registroParaEdicao ? "Atualizando..." : "Criando..."}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {registroParaEdicao ? "Atualizar Registro" : "Criar Registro"}
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default RegistroForm
