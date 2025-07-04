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
      try {
        const classificacoesRes = await classificacoesAPI.listar()
        setClassificacoes(classificacoesRes.data.classificacoes || {})
      } catch (error) {
        console.error("Erro ao carregar classificações:", error)
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
      const newData = { ...prev, [name]: value }

      // Se mudou o grupo de classificação, limpar subgrupo
      if (name === "classificacao_grupo") {
        newData.classificacao_subgrupo = ""
      }

      return newData
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
      })

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ""
    } catch (err) {
      console.error("❌ Erro ao criar registro:", err)
      const errorMessage = err.response?.data?.message || "Erro ao criar registro"
      setMensagem({ tipo: "error", texto: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  // Obter subgrupos baseado no grupo selecionado
  const getSubgrupos = () => {
    if (!formData.classificacao_grupo || !classificacoes[formData.classificacao_grupo]) {
      return []
    }
    return classificacoes[formData.classificacao_grupo] || []
  }

  if (obraSuspensa) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Obra Suspensa:</strong> Não é possível criar novos registros para esta obra no momento.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Novo Registro</h1>
          <p className="text-muted-foreground">Criar um novo registro no sistema</p>
        </div>
      </div>

      {mensagem.texto && (
        <Alert className={mensagem.tipo === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          {mensagem.tipo === "error" ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={mensagem.tipo === "error" ? "text-red-800" : "text-green-800"}>
            {mensagem.texto}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações do Registro</CardTitle>
          <CardDescription>Preencha os dados do novo registro</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">
                  Título <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  placeholder="Digite o título do registro"
                  required
                />
              </div>

              {/* Tipo de Registro */}
              <div className="space-y-2">
                <Label htmlFor="tipo_registro_id">
                  Tipo de Registro <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.tipo_registro_id} onValueChange={handleTipoRegistroChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data do Registro */}
              <div className="space-y-2">
                <Label htmlFor="data_registro">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Data do Registro <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data_registro"
                  name="data_registro"
                  type="date"
                  value={formData.data_registro}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Código/Número */}
              <div className="space-y-2">
                <Label htmlFor="codigo_numero">
                  <Hash className="inline h-4 w-4 mr-1" />
                  Código/Número
                </Label>
                <Input
                  id="codigo_numero"
                  name="codigo_numero"
                  value={formData.codigo_numero}
                  onChange={handleChange}
                  placeholder="Ex: REG-001, DOC-123"
                />
              </div>

              {/* Obra (apenas para admin) */}
              {user?.role === "administrador" && (
                <div className="space-y-2">
                  <Label htmlFor="obra_id">
                    <Building2 className="inline h-4 w-4 mr-1" />
                    Obra <span className="text-red-500">*</span>
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
                          <div className="flex items-center gap-2">
                            <span>{obra.nome}</span>
                            <Badge variant={obra.status === "Ativa" ? "default" : "secondary"} className="text-xs">
                              {obra.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Classificação Grupo */}
              <div className="space-y-2">
                <Label htmlFor="classificacao_grupo">Classificação - Grupo</Label>
                <Select
                  value={formData.classificacao_grupo}
                  onValueChange={(value) => handleSelectChange("classificacao_grupo", value)}
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
                <Label htmlFor="classificacao_subgrupo">Classificação - Subgrupo</Label>
                <Select
                  value={formData.classificacao_subgrupo}
                  onValueChange={(value) => handleSelectChange("classificacao_subgrupo", value)}
                  disabled={!formData.classificacao_grupo}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        formData.classificacao_grupo ? "Selecione o subgrupo" : "Primeiro selecione um grupo"
                      }
                    />
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
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Descreva detalhadamente o registro"
                rows={4}
                required
              />
            </div>

            {/* Anexo */}
            <div className="space-y-2">
              <Label htmlFor="anexo">
                <Upload className="inline h-4 w-4 mr-1" />
                Anexo (Opcional)
              </Label>
              <Input
                id="anexo"
                name="anexo"
                type="file"
                onChange={handleChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt,.zip,.rar"
              />
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, GIF, TXT, ZIP, RAR
              </p>
            </div>

            {/* Botão Submit */}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="min-w-32">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Criar Registro
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
