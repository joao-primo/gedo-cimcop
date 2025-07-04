"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Upload, Download, FileText, AlertCircle, CheckCircle, X, ArrowLeft } from "lucide-react"
import api from "../services/api"

const ImportacaoLote = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState([])
  const [tiposRegistro, setTiposRegistro] = useState([])
  const [classificacoes, setClassificacoes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [subgrupos, setSubgrupos] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResult, setImportResult] = useState(null)

  const [formData, setFormData] = useState({
    obra_id: "",
    tipo_registro_id: "",
    classificacao_grupo: "",
    classificacao_subgrupo: "",
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    // Quando o grupo muda, atualizar os subgrupos disponíveis
    if (formData.classificacao_grupo) {
      const subgruposDoGrupo = classificacoes.filter((c) => c.grupo === formData.classificacao_grupo)
      setSubgrupos(subgruposDoGrupo)

      // Limpar subgrupo se não for válido para o novo grupo
      if (formData.classificacao_subgrupo) {
        const subgrupoValido = subgruposDoGrupo.find((s) => s.subgrupo === formData.classificacao_subgrupo)
        if (!subgrupoValido) {
          setFormData((prev) => ({ ...prev, classificacao_subgrupo: "" }))
        }
      }
    } else {
      setSubgrupos([])
      setFormData((prev) => ({ ...prev, classificacao_subgrupo: "" }))
    }
  }, [formData.classificacao_grupo, classificacoes])

  const fetchInitialData = async () => {
    try {
      const [obrasRes, tiposRes, classificacoesRes] = await Promise.all([
        api.get("/obras/"),
        api.get("/tipos-registro/"),
        api.get("/classificacoes/"),
      ])

      setObras(obrasRes.data || [])
      setTiposRegistro(tiposRes.data || [])
      setClassificacoes(classificacoesRes.data || [])

      // Extrair grupos únicos
      const gruposUnicos = [...new Set((classificacoesRes.data || []).map((c) => c.grupo))].filter(Boolean).sort()
      setGrupos(gruposUnicos)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados do formulário")
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Verificar se é um arquivo Excel
      const allowedTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ]

      if (!allowedTypes.includes(file.type)) {
        toast.error("Por favor, selecione um arquivo Excel (.xls ou .xlsx)")
        return
      }

      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await api.get("/importacao/template", {
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "template_importacao.xlsx")
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success("Template baixado com sucesso!")
    } catch (error) {
      console.error("Erro ao baixar template:", error)
      toast.error("Erro ao baixar template")
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo para importar")
      return
    }

    if (!formData.obra_id || !formData.tipo_registro_id) {
      toast.error("Selecione a obra e o tipo de registro")
      return
    }

    setLoading(true)
    setUploadProgress(0)

    try {
      const submitData = new FormData()
      submitData.append("arquivo", selectedFile)
      submitData.append("obra_id", formData.obra_id)
      submitData.append("tipo_registro_id", formData.tipo_registro_id)

      if (formData.classificacao_grupo) {
        submitData.append("classificacao_grupo", formData.classificacao_grupo)
      }
      if (formData.classificacao_subgrupo) {
        submitData.append("classificacao_subgrupo", formData.classificacao_subgrupo)
      }

      const response = await api.post("/importacao/lote", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        },
      })

      setImportResult(response.data)
      toast.success("Importação concluída!")
    } catch (error) {
      console.error("Erro na importação:", error)
      toast.error(error.response?.data?.detail || "Erro na importação")
      setImportResult({
        sucesso: 0,
        erros: 1,
        detalhes: [error.response?.data?.detail || "Erro desconhecido"],
      })
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setImportResult(null)
    setUploadProgress(0)
    setFormData({
      obra_id: "",
      tipo_registro_id: "",
      classificacao_grupo: "",
      classificacao_subgrupo: "",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Importação em Lote</h1>
              <p className="text-gray-600">Importe múltiplos registros via planilha Excel</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Como usar a importação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                    1
                  </div>
                  <h3 className="font-medium mb-1">Baixe o Template</h3>
                  <p className="text-sm text-gray-600">Baixe a planilha modelo com as colunas corretas</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                    2
                  </div>
                  <h3 className="font-medium mb-1">Preencha os Dados</h3>
                  <p className="text-sm text-gray-600">Complete a planilha com os registros desejados</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                    3
                  </div>
                  <h3 className="font-medium mb-1">Faça o Upload</h3>
                  <p className="text-sm text-gray-600">Selecione a obra, tipo e envie o arquivo</p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button onClick={downloadTemplate} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Importação */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Importação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Obra */}
                <div className="space-y-2">
                  <Label htmlFor="obra">Obra *</Label>
                  <Select value={formData.obra_id} onValueChange={(value) => handleInputChange("obra_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {obras.map((obra) => (
                        <SelectItem key={obra.id} value={obra.id.toString()}>
                          {obra.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Registro */}
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Registro *</Label>
                  <Select
                    value={formData.tipo_registro_id}
                    onValueChange={(value) => handleInputChange("tipo_registro_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposRegistro.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id.toString()}>
                          {tipo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Classificação Grupo */}
                <div className="space-y-2">
                  <Label htmlFor="grupo">Classificação Grupo (Opcional)</Label>
                  <Select
                    value={formData.classificacao_grupo}
                    onValueChange={(value) => handleInputChange("classificacao_grupo", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum grupo</SelectItem>
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo} value={grupo}>
                          {grupo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Classificação Subgrupo */}
                <div className="space-y-2">
                  <Label htmlFor="subgrupo">Classificação Subgrupo (Opcional)</Label>
                  <Select
                    value={formData.classificacao_subgrupo}
                    onValueChange={(value) => handleInputChange("classificacao_subgrupo", value)}
                    disabled={!formData.classificacao_grupo || formData.classificacao_grupo === "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um subgrupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum subgrupo</SelectItem>
                      {subgrupos.map((item) => (
                        <SelectItem key={item.id} value={item.subgrupo}>
                          {item.subgrupo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Upload de Arquivo */}
              <div className="space-y-2">
                <Label htmlFor="arquivo">Arquivo Excel *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Clique para selecionar o arquivo Excel
                        </span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">Apenas arquivos .xlsx ou .xls</p>
                    </div>
                  </div>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processando importação...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                  Limpar
                </Button>
                <Button onClick={handleImport} disabled={loading || !selectedFile}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Iniciar Importação
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultado da Importação */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {importResult.sucesso > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                Resultado da Importação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.sucesso || 0}</div>
                      <div className="text-sm text-green-700">Registros importados com sucesso</div>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResult.erros || 0}</div>
                      <div className="text-sm text-red-700">Registros com erro</div>
                    </div>
                  </div>
                </div>

                {importResult.detalhes && importResult.detalhes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Detalhes dos erros:</h4>
                    <div className="space-y-2">
                      {importResult.detalhes.map((detalhe, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{detalhe}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.sucesso > 0 && (
                  <div className="flex justify-center">
                    <Button onClick={() => navigate("/dashboard")}>Ir para Dashboard</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ImportacaoLote
