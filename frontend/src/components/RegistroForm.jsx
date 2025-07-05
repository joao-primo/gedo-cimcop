"use client"

import { useEffect, useState } from "react"
import { tiposRegistroAPI, obrasAPI, authAPI, registrosAPI, classificacoesAPI } from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, AlertTriangle, CheckCircle, Loader2, Building2, Calendar, Hash } from "lucide-react"

export default function RegistroForm() {
  const [tipos, setTipos] = useState([])
  const [obras, setObras] = useState([])
  const [classificacoes, setClassificacoes] = useState({})
  const [user, setUser] = useState(null)
  const [obraSuspensa, setObraSuspensa] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    titulo: "",
    tipo_registro: "",
    tipo_registro_id: "",
    data_registro: "",
    codigo_numero: "",
    descricao: "",
    anexo: null,
    obra_id: "",
    classificacao_grupo: "",
    classificacao_subgrupo: "",
    classificacao_id: "",
  })
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const tiposRes = await tiposRegistroAPI.listar()
      setTipos(tiposRes.data.tipos_registro || [])

      // Carregar classificações
      const classificacoesRes = await classificacoesAPI.listar()
      console.log("Classificações carregadas:", classificacoesRes.data)

      // Verificar se a resposta tem a estrutura esperada
      if (classificacoesRes.data && classificacoesRes.data.classificacoes) {
        setClassificacoes(classificacoesRes.data.classificacoes)
      } else {
        console.warn("Estrutura de classificações inesperada:", classificacoesRes.data)
        setClassificacoes({})
      }

      const userRes = await authAPI.me()
      const userData = userRes.data.user
      setUser(userData)

      if (userData.role === "administrador") {
        const obrasRes = await obrasAPI.listar()
        setObras(obrasRes.data.obras || [])
      } else {
        setFormData((prev) => ({ ...prev, obra_id: userData.obra_id?.toString() || "" }))

        if (userData.obra_id) {
          const obraRes = await obrasAPI.obter(userData.obra_id)
          if (obraRes.data.obra?.status === "Suspensa") {
            setObraSuspensa(true)
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error)
      setMensagem({ tipo: "error", texto: "Erro ao carregar dados iniciais." })
    }
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target
    if (name === "anexo") {
      setFormData({ ...formData, anexo: files[0] })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value }

      // Se mudou o grupo de classificação, limpar subgrupo e ID
      if (name === "classificacao_grupo") {
        newFormData.classificacao_subgrupo = ""
        newFormData.classificacao_id = ""
      }

      // Se mudou o subgrupo, limpar ID
      if (name === "classificacao_subgrupo") {
        newFormData.classificacao_id = ""
      }

      return newFormData
    })
  }

  const handleTipoRegistroChange = (value) => {
    const tipoSelecionado = tipos.find((t) => t.id.toString() === value)

    if (tipoSelecionado) {
      setFormData((prev) => ({
        ...prev,
        tipo_registro_id: value,
        tipo_registro: tipoSelecionado.nome,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (obraSuspensa) return

    console.log("📤 Dados do formulário antes do envio:", formData)

    setLoading(true)
    setMensagem({ tipo: "", texto: "" })

    // Construir FormData corretamente
    const data = new FormData()

    // Campos obrigatórios
    if (formData.titulo) data.append("titulo", formData.titulo)
    if (formData.tipo_registro) data.append("tipo_registro", formData.tipo_registro)
    if (formData.tipo_registro_id) data.append("tipo_registro_id", formData.tipo_registro_id)
    if (formData.data_registro) data.append("data_registro", formData.data_registro)
    if (formData.codigo_numero) data.append("codigo_numero", formData.codigo_numero)
    if (formData.descricao) data.append("descricao", formData.descricao)
    if (formData.obra_id) data.append("obra_id", formData.obra_id)

    // Campos de classificação
    if (formData.classificacao_grupo) data.append("classificacao_grupo", formData.classificacao_grupo)
    if (formData.classificacao_subgrupo) data.append("classificacao_subgrupo", formData.classificacao_subgrupo)
    if (formData.classificacao_id) data.append("classificacao_id", formData.classificacao_id)

    // Anexo (opcional)
    if (formData.anexo) {
      data.append("anexo", formData.anexo)
    }

    // Debug: Mostrar o que está sendo enviado
    console.log("📎 Dados sendo enviados:")
    for (const [key, value] of data.entries()) {
      console.log(`  ${key}: ${value}`)
    }

    try {
      console.log("💾 Criando registro...")
      const response = await registrosAPI.criar(data)
      console.log("✅ Resposta do servidor:", response.data)
      setMensagem({ tipo: "success", texto: "Registro criado com sucesso!" })

      // Reset form
      setFormData({
        titulo: "",
        tipo_registro: "",
        tipo_registro_id: "",
        data_registro: "",
        codigo_numero: "",
        descricao: "",
        anexo: null,
        obra_id: user?.role === "administrador" ? "" : user?.obra_id?.toString() || "",
        classificacao_grupo: "",
        classificacao_subgrupo: "",
        classificacao_id: "",
      })

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ""
    } catch (err) {
      console.error("❌ Erro completo:", err)
      console.error("❌ Resposta do erro:", err.response?.data)
      setMensagem({
        tipo: "error",
        texto: err.response?.data?.message || "Erro ao criar registro.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para obter subgrupos baseado no grupo selecionado
  const getSubgrupos = () => {
    if (!formData.classificacao_grupo || !classificacoes[formData.classificacao_grupo]) {
      return []
    }
    return Object.keys(classificacoes[formData.classificacao_grupo])
  }

  // Função para obter IDs baseado no grupo e subgrupo selecionados
  const getClassificacaoIds = () => {
    if (
      !formData.classificacao_grupo ||
      !formData.classificacao_subgrupo ||
      !classificacoes[formData.classificacao_grupo] ||
      !classificacoes[formData.classificacao_grupo][formData.classificacao_subgrupo]
    ) {
      return []
    }
    return classificacoes[formData.classificacao_grupo][formData.classificacao_subgrupo]
  }

  if (obraSuspensa) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <div className="ml-2">
            <h3 className="text-lg font-semibold text-yellow-800">Registro Bloqueado</h3>
            <p className="text-yellow-700 mt-1">
              A criação de registros está desabilitada porque a obra está <strong>suspensa</strong>.
            </p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Novo Registro</h1>
        <p className="text-gray-600">Crie um novo registro de documento</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">Novo Registro</CardTitle>
              <CardDescription>Preencha os dados para criar um novo registro de documento</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {mensagem.texto && (
            <Alert
              className={`mb-6 ${
                mensagem.tipo === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              {mensagem.tipo === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={mensagem.tipo === "success" ? "text-green-700" : "text-red-700"}>
                {mensagem.texto}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Obra Selection (Admin only) */}
            {user?.role === "administrador" && (
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>Obra *</span>
                </Label>
                <Select
                  value={formData.obra_id}
                  onValueChange={(value) => handleSelectChange("obra_id", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a obra" />
                  </SelectTrigger>
                  <SelectContent>
                    {obras.map((obra) => (
                      <SelectItem key={obra.id} value={obra.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{obra.codigo}</Badge>
                          <span>{obra.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Grid Layout for Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  placeholder="Digite o título do registro"
                  required
                />
              </div>

              {/* Tipo de Registro - Agora mais largo */}
              <div className="space-y-2">
                <Label>Tipo de Registro *</Label>
                <Select value={formData.tipo_registro_id} onValueChange={handleTipoRegistroChange} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tipos.length === 0 ? "Nenhum tipo disponível" : "Selecione o tipo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500 text-center">Nenhum tipo de registro disponível</div>
                    ) : (
                      tipos
                        .filter((tipo) => tipo && tipo.id && tipo.nome)
                        .map((tipo) => {
                          return (
                            <SelectItem key={tipo.id} value={tipo.id.toString()}>
                              {tipo.nome}
                            </SelectItem>
                          )
                        })
                    )}
                  </SelectContent>
                </Select>
                {tipos.length === 0 && <p className="text-sm text-red-600">⚠️ Nenhum tipo de registro encontrado</p>}
              </div>

              {/* Data do Registro */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Data do Registro *</span>
                </Label>
                <Input
                  type="date"
                  name="data_registro"
                  value={formData.data_registro}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Código/Número */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <span>Código/Número *</span>
                </Label>
                <Input
                  name="codigo_numero"
                  value={formData.codigo_numero}
                  onChange={handleChange}
                  placeholder="Ex: DOC-001, REG-2024-001"
                  required
                />
              </div>
            </div>

            {/* Classificação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Classificação Grupo */}
              <div className="space-y-2">
                <Label>Classificação Grupo *</Label>
                <Select
                  value={formData.classificacao_grupo}
                  onValueChange={(value) => handleSelectChange("classificacao_grupo", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(classificacoes).map((grupo) => (
                      <SelectItem key={grupo} value={grupo}>
                        {grupo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Classificação Subgrupo */}
              <div className="space-y-2">
                <Label>Classificação Subgrupo *</Label>
                <Select
                  value={formData.classificacao_subgrupo}
                  onValueChange={(value) => handleSelectChange("classificacao_subgrupo", value)}
                  required
                  disabled={!formData.classificacao_grupo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o subgrupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSubgrupos().map((subgrupo) => (
                      <SelectItem key={subgrupo} value={subgrupo}>
                        {subgrupo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Classificação ID */}
              <div className="space-y-2">
                <Label>Classificação ID *</Label>
                <Select
                  value={formData.classificacao_id}
                  onValueChange={(value) => handleSelectChange("classificacao_id", value)}
                  required
                  disabled={!formData.classificacao_subgrupo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {getClassificacaoIds().map((id) => (
                      <SelectItem key={id} value={id.toString()}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição Detalhada *</Label>
              <Textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                rows={4}
                placeholder="Descreva detalhadamente o conteúdo do registro..."
                required
              />
            </div>

            {/* Anexo */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Anexo</span>
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  name="anexo"
                  onChange={handleChange}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {formData.anexo && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Arquivo selecionado: {formData.anexo.name}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Tipos aceitos: PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG, JPEG, GIF
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formData.tipo_registro_id}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Salvar Registro
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
