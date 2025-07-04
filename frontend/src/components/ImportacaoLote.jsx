"use client"

import { useState, useRef } from "react"
import { importacaoAPI } from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react"

export default function ImportacaoLote() {
  const [arquivo, setArquivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [resultado, setResultado] = useState(null)
  const [showDialog, setShowDialog] = useState(false)
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" })
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ]

      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".csv")) {
        setMensagem({
          tipo: "error",
          texto: "Formato de arquivo não suportado. Use apenas arquivos Excel (.xlsx, .xls) ou CSV.",
        })
        return
      }

      setArquivo(file)
      setMensagem({ tipo: "", texto: "" })
    }
  }

  const handleImport = async () => {
    if (!arquivo) {
      setMensagem({ tipo: "error", texto: "Selecione um arquivo para importar." })
      return
    }

    setLoading(true)
    setProgresso(0)
    setMensagem({ tipo: "", texto: "" })

    const formData = new FormData()
    formData.append("arquivo", arquivo)

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgresso((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await importacaoAPI.importarLote(formData)

      clearInterval(progressInterval)
      setProgresso(100)

      setResultado(response.data)
      setShowDialog(true)

      // Limpar arquivo
      setArquivo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Erro na importação:", error)
      const errorMessage = error.response?.data?.message || "Erro ao processar importação"
      setMensagem({ tipo: "error", texto: errorMessage })
    } finally {
      setLoading(false)
      setProgresso(0)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await importacaoAPI.downloadTemplate()

      // Criar blob e download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "template_importacao_registros.xlsx"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Erro ao baixar template:", error)
      setMensagem({ tipo: "error", texto: "Erro ao baixar template" })
    }
  }

  const closeDialog = () => {
    setShowDialog(false)
    setResultado(null)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Upload className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Importação em Lote</h1>
          <p className="text-muted-foreground">Importe múltiplos registros de uma vez</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card de Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload do Arquivo
            </CardTitle>
            <CardDescription>Selecione um arquivo Excel ou CSV com os registros para importar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="arquivo">Arquivo de Importação</Label>
              <Input
                ref={fileInputRef}
                id="arquivo"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">Formatos aceitos: .xlsx, .xls, .csv</p>
            </div>

            {arquivo && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">{arquivo.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processando importação...</span>
                  <span>{progresso}%</span>
                </div>
                <Progress value={progresso} className="w-full" />
              </div>
            )}

            <Button onClick={handleImport} disabled={!arquivo || loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Iniciar Importação
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Card de Instruções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Como Usar
            </CardTitle>
            <CardDescription>Instruções para preparar seu arquivo de importação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Baixe o template</p>
                  <p className="text-sm text-muted-foreground">Use nosso modelo para garantir o formato correto</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Preencha os dados</p>
                  <p className="text-sm text-muted-foreground">Complete todas as colunas obrigatórias no arquivo</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Faça o upload</p>
                  <p className="text-sm text-muted-foreground">Selecione o arquivo e clique em "Iniciar Importação"</p>
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={downloadTemplate} className="w-full bg-transparent">
              <Download className="mr-2 h-4 w-4" />
              Baixar Template
            </Button>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Importante:</strong> Verifique se todos os dados estão corretos antes da importação. Registros
                com erros serão rejeitados.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Resultado */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resultado?.sucesso ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              Resultado da Importação
            </DialogTitle>
            <DialogDescription>Resumo do processamento do arquivo</DialogDescription>
          </DialogHeader>

          {resultado && (
            <div className="space-y-4">
              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{resultado.registros_criados || 0}</div>
                  <div className="text-sm text-green-700">Criados</div>
                </div>
                <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{resultado.registros_erro || 0}</div>
                  <div className="text-sm text-red-700">Erros</div>
                </div>
                <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{resultado.total_processados || 0}</div>
                  <div className="text-sm text-blue-700">Total</div>
                </div>
              </div>

              {/* Erros */}
              {resultado.erros && resultado.erros.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Erros Encontrados:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {resultado.erros.map((erro, index) => (
                      <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                        <strong>Linha {erro.linha}:</strong> {erro.erro}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensagem de sucesso */}
              {resultado.sucesso && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Importação concluída com sucesso! {resultado.registros_criados} registros foram criados.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={closeDialog} variant="outline">
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
