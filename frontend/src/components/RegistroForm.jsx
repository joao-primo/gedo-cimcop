"use client"

import { useEffect, useState } from "react"
import { tiposRegistroAPI, obrasAPI, authAPI, registrosAPI } from "../services/api" // ← CORREÇÃO: Usar APIs configuradas
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Building2,
  Calendar,
  Hash,
  Database,
} from "lucide-react"
import ImportacaoLote from "./ImportacaoLote"

export default function RegistroForm() {
  const [tipos, setTipos] = useState([])
  const [obras, setObras] = useState([])
  const [user, setUser] = useState(null)
  const [obraSuspensa, setObraSuspensa] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showImportacao, setShowImportacao] = useState(false)
  const [formData, setFormData] = useState({
    titulo: "",
    tipo_registro: "",
    tipo_registro_id: "",
    data_registro: "",
    codigo_numero: "",
    descricao: "",
    anexo: null,
    obra_id: "",
  })
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      console.log("🔄 Carregando dados iniciais...")

      // Carregar tipos de registro
      console.log("📋 Carregando tipos de registro...")
      const tiposRes = await tiposRegistroAPI.listar() // ← CORREÇÃO
      console.log("✅ Tipos carregados:", tiposRes.data.tipos_registro)
      setTipos(tiposRes.data.tipos_registro || [])

      // Carregar dados do usuário
      console.log("👤 Carregando dados do usuário...")
      const userRes = await authAPI.me() // ← CORREÇÃO
      const userData = userRes.data.user
      console.log("✅ Usuário carregado:", userData)
      setUser(userData)

      if (userData.role === "administrador") {
        console.log("🏗️ Carregando obras (admin)...")
        const obrasRes = await obrasAPI.listar() // ← CORREÇÃO
        console.log("✅ Obras carregadas:", obrasRes.data.obras)
        setObras(obrasRes.data.obras || [])
      } else {
        setFormData((prev) => ({ ...prev, obra_id: userData.obra_id }))

        // Verificar status da obra
        if (userData.obra_id) {
          console.log("🔍 Verificando status da obra...")
          const obraRes = await obrasAPI.obter(userData.obra_id) // ← CORREÇÃO
          if (obraRes.data.obra?.status === "Suspensa") {
            console.log("⚠️ Obra suspensa detectada")
            setObraSuspensa(true)
          }
        }
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados iniciais:", error)
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
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (obraSuspensa) return

    setLoading(true)
    setMensagem({ tipo: "", texto: "" })

    const data = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value)
    })

    try {
      console.log("💾 Criando registro...")
      await registrosAPI.criar(data) // ← CORREÇÃO
      console.log("✅ Registro criado com sucesso!")
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
        obra_id: user?.role === "administrador" ? "" : user?.obra_id,
      })

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ""
    } catch (err) {
      console.error("❌ Erro ao criar registro:", err)
      setMensagem({
        tipo: "error",
        texto: err.response?.data?.message || "Erro ao criar registro.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImportacaoSuccess = () => {
    setMensagem({ tipo: "success", texto: "Importação concluída com sucesso!" })
    // Recarregar dados se necessário
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
      {/* Header com opções */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registros</h1>
          <p className="text-gray-600">Crie novos registros ou importe em lote</p>
        </div>
        <Button onClick={() => setShowImportacao(true)} variant="outline" className="flex items-center space-x-2">
          <Database className="h-4 w-4" />
          <span>Importação em Lote</span>
        </Button>
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

              {/* Tipo de Registro */}
              <div className="space-y-2">
                <Label>Tipo de Registro *</Label>
                <Select
                  value={formData.tipo_registro_id}
                  onValueChange={(value) => {
                    const tipo = tipos.find((t) => t.id.toString() === value)
                    handleSelectChange("tipo_registro_id", value)
                    handleSelectChange("tipo_registro", tipo?.nome || "")
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.length === 0 ? (
                      <SelectItem value="" disabled>
                        Nenhum tipo disponível
                      </SelectItem>
                    ) : (
                      tipos.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id.toString()}>
                          {tipo.nome}
                        </SelectItem>
                      ))
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
              <Button type="submit" disabled={loading}>
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

      {/* Modal de Importação */}
      {showImportacao && (
        <ImportacaoLote onClose={() => setShowImportacao(false)} onSuccess={handleImportacaoSuccess} />
      )}
    </div>
  )
}
