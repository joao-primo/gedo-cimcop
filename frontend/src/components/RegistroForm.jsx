"use client"

import { useEffect, useState } from "react"
import { tipoRegistroAPI, obrasAPI, authAPI, registroAPI, classificacaoAPI } from "../services/api"
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
  })
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const tiposRes = await tipoRegistroAPI.listar()
      setTipos(tiposRes.data.tipos_registro || [])

      // Carregar classificações
      const classificacoesRes = await classificacaoAPI.listar()
      console.log("Classificações carregadas:", classificacoesRes.data)

      // Processar classificações para estrutura hierárquica
      if (classificacoesRes.data && classificacoesRes.data.classificacoes) {
        const classificacoesProcessadas = {}

        // Agrupar por grupo e subgrupo
        Object.entries(classificacoesRes.data.classificacoes).forEach(([grupo, subgrupos]) => {
          classificacoesProcessadas[grupo] = {}

          if (Array.isArray(subgrupos)) {
            // Se subgrupos é um array de objetos
            subgrupos.forEach((item) => {
              if (item.subgrupo) {
                if (!classificacoesProcessadas[grupo][item.subgrupo]) {
                  classificacoesProcessadas[grupo][item.subgrupo] = []
                }
                classificacoesProcessadas[grupo][item.subgrupo].push(item.id)
              }
            })
          } else if (typeof subgrupos === "object") {
            // Se subgrupos já é um objeto estruturado
            classificacoesProcessadas[grupo] = subgrupos
          }
        })

        console.log("Classificações processadas:", classificacoesProcessadas)
        setClassificacoes(classificacoesProcessadas)
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

      // Se mudou o grupo de classificação, limpar subgrupo
      if (name === "classificacao_grupo") {
        newFormData.classificacao_subgrupo = ""
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
      const response = await registroAPI.criar(data)
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

  if (obraSuspensa) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <Alert className="border-yellow-200 bg-yellow-50 p-8">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
          <div className="ml-3">
            <h3 className="text-xl font-semibold text-yellow-800">Registro Bloqueado</h3>
            <p className="text-yellow-700 mt-2 text-lg">
              A criação de registros está desabilitada porque a obra está <strong>suspensa</strong>.
            </p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Novo Registro</h1>
        <p className="text-gray-600 text-lg">Crie um novo registro de documento</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pb-8">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-3xl">Novo Registro</CardTitle>
              <CardDescription className="text-lg mt-2">
                Preencha os dados para criar um novo registro de documento
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {mensagem.texto && (
            <Alert
              className={`mb-8 p-6 ${
                mensagem.tipo === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              {mensagem.tipo === "success" ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              <AlertDescription
                className={`text-lg ml-2 ${mensagem.tipo === "success" ? "text-green-700" : "text-red-700"}`}
              >
                {mensagem.texto}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Obra Selection (Admin only) */}
            {user?.role === "administrador" && (
              <div className="space-y-3">
                <Label className="flex items-center space-x-2 text-lg font-medium">
                  <Building2 className="h-5 w-5" />
                  <span>Obra *</span>
                </Label>
                <Select
                  value={formData.obra_id}
                  onValueChange={(value) => handleSelectChange("obra_id", value)}
                  required
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Selecione a obra" />
                  </SelectTrigger>
                  <SelectContent>
                    {obras.map((obra) => (
                      <SelectItem key={obra.id} value={obra.id.toString()} className="py-3">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="text-sm">
                            {obra.codigo}
                          </Badge>
                          <span className="text-lg">{obra.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Grid Layout for Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Título */}
              <div className="space-y-3">
                <Label htmlFor="titulo" className="text-lg font-medium">
                  Título *
                </Label>
                <Input
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  placeholder="Digite o título do registro"
                  className="h-14 text-lg"
                  required
                />
              </div>

              {/* Tipo de Registro */}
              <div className="space-y-3">
                <Label className="text-lg font-medium">Tipo de Registro *</Label>
                <Select value={formData.tipo_registro_id} onValueChange={handleTipoRegistroChange} required>
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder={tipos.length === 0 ? "Nenhum tipo disponível" : "Selecione o tipo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.length === 0 ? (
                      <div className="p-4 text-lg text-gray-500 text-center">Nenhum tipo de registro disponível</div>
                    ) : (
                      tipos
                        .filter((tipo) => tipo && tipo.id && tipo.nome)
                        .map((tipo) => {
                          return (
                            <SelectItem key={tipo.id} value={tipo.id.toString()} className="py-3 text-lg">
                              {tipo.nome}
                            </SelectItem>
                          )
                        })
                    )}
                  </SelectContent>
                </Select>
                {tipos.length === 0 && <p className="text-lg text-red-600">⚠️ Nenhum tipo de registro encontrado</p>}
              </div>

              {/* Data do Registro */}
              <div className="space-y-3">
                <Label className="flex items-center space-x-2 text-lg font-medium">
                  <Calendar className="h-5 w-5" />
                  <span>Data do Registro *</span>
                </Label>
                <Input
                  type="date"
                  name="data_registro"
                  value={formData.data_registro}
                  onChange={handleChange}
                  className="h-14 text-lg"
                  required
                />
              </div>

              {/* Código/Número */}
              <div className="space-y-3">
                <Label className="flex items-center space-x-2 text-lg font-medium">
                  <Hash className="h-5 w-5" />
                  <span>Código/Número *</span>
                </Label>
                <Input
                  name="codigo_numero"
                  value={formData.codigo_numero}
                  onChange={handleChange}
                  placeholder="Ex: DOC-001, REG-2024-001"
                  className="h-14 text-lg"
                  required
                />
              </div>
            </div>

            {/* Classificação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Classificação Grupo */}
              <div className="space-y-3">
                <Label className="text-lg font-medium">Classificação Grupo *</Label>
                <Select
                  value={formData.classificacao_grupo}
                  onValueChange={(value) => handleSelectChange("classificacao_grupo", value)}
                  required
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(classificacoes).map((grupo) => (
                      <SelectItem key={grupo} value={grupo} className="py-3 text-lg">
                        {grupo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Classificação Subgrupo */}
              <div className="space-y-3">
                <Label className="text-lg font-medium">Classificação Subgrupo *</Label>
                <Select
                  value={formData.classificacao_subgrupo}
                  onValueChange={(value) => handleSelectChange("classificacao_subgrupo", value)}
                  required
                  disabled={!formData.classificacao_grupo}
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Selecione o subgrupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSubgrupos().map((subgrupo) => (
                      <SelectItem key={subgrupo} value={subgrupo} className="py-3 text-lg">
                        {subgrupo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-3">
              <Label htmlFor="descricao" className="text-lg font-medium">
                Descrição Detalhada *
              </Label>
              <Textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                rows={6}
                placeholder="Descreva detalhadamente o conteúdo do registro..."
                className="text-lg resize-none"
                required
              />
            </div>

            {/* Anexo */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2 text-lg font-medium">
                <Upload className="h-5 w-5" />
                <span>Anexo</span>
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  name="anexo"
                  onChange={handleChange}
                  className="w-full text-lg text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-md file:border-0 file:text-lg file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {formData.anexo && (
                  <div className="mt-4 flex items-center space-x-3 text-lg text-gray-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Arquivo selecionado: {formData.anexo.name}</span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-3">
                  Tipos aceitos: PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG, JPEG, GIF
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-6 pt-8 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                className="h-14 px-8 text-lg"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formData.tipo_registro_id} className="h-14 px-8 text-lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-3 h-5 w-5" />
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
