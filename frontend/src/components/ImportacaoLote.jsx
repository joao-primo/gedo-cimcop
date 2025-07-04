"use client"

import { useState, useContext } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from "lucide-react"

const ImportacaoLote = () => {
  const { user } = useContext(AuthContext)
  const [etapa, setEtapa] = useState("upload") // upload, revisao, processando, concluido
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [arquivo, setArquivo] = useState(null)
  const [registrosProcessados, setRegistrosProcessados] = useState([])
  const [errosProcessamento, setErrosProcessamento] = useState([])
  const [registrosSelecionados, setRegistrosSelecionados] = useState([])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ]

      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de arquivo não permitido. Use Excel (.xlsx, .xls) ou CSV")
        return
      }

      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Arquivo muito grande. Máximo permitido: 10MB")
        return
      }

      setArquivo(file)
      setError("")
    }
  }

  const downloadTemplate = async () => {
    try {
      setLoading(true)

      const token = localStorage.getItem("token")
      const response = await fetch("/api/importacao/template", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `template_importacao_${new Date().toISOString().split("T")[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Erro ao baixar template")
      }
    } catch (err) {
      console.error("Erro ao baixar template:", err)
      setError("Erro ao baixar template")
    } finally {
      setLoading(false)
    }
  }

  const processarPlanilha = async () => {
    if (!arquivo) {
      setError("Selecione um arquivo para processar")
      return
    }

    try {
      setLoading(true)
      setError("")

      const formData = new FormData()
      formData.append("arquivo", arquivo)

      const token = localStorage.getItem("token")
      const response = await fetch("/api/importacao/processar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setRegistrosProcessados(result.registros || [])
        setErrosProcessamento(result.erros || [])
        setRegistrosSelecionados(result.registros?.map((r) => r.id_temp) || [])
        setEtapa("revisao")

        if (result.erros && result.erros.length > 0) {
          setError(`${result.erros.length} linha(s) com erro foram encontradas. Revise os dados abaixo.`)
        } else {
          setSuccess(`${result.registros?.length || 0} registro(s) processado(s) com sucesso!`)
        }
      } else {
        setError(result.message || "Erro ao processar planilha")
      }
    } catch (err) {
      console.error("Erro ao processar planilha:", err)
      setError("Erro ao processar planilha")
    } finally {
      setLoading(false)
    }
  }

  const finalizarImportacao = async () => {
    const registrosParaImportar = registrosProcessados.filter((r) => registrosSelecionados.includes(r.id_temp))

    if (registrosParaImportar.length === 0) {
      setError("Selecione pelo menos um registro para importar")
      return
    }

    try {
      setLoading(true)
      setError("")
      setEtapa("processando")

      const token = localStorage.getItem("token")
      const response = await fetch("/api/importacao/finalizar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registros: registrosParaImportar,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(`${result.registros_criados?.length || 0} registro(s) importado(s) com sucesso!`)
        setEtapa("concluido")
      } else {
        setError(result.message || "Erro ao finalizar importação")
        setEtapa("revisao")
      }
    } catch (err) {
      console.error("Erro ao finalizar importação:", err)
      setError("Erro ao finalizar importação")
      setEtapa("revisao")
    } finally {
      setLoading(false)
    }
  }

  const toggleRegistroSelecionado = (idTemp) => {
    setRegistrosSelecionados((prev) => (prev.includes(idTemp) ? prev.filter((id) => id !== idTemp) : [...prev, idTemp]))
  }

  const selecionarTodos = () => {
    if (registrosSelecionados.length === registrosProcessados.length) {
      setRegistrosSelecionados([])
    } else {
      setRegistrosSelecionados(registrosProcessados.map((r) => r.id_temp))
    }
  }

  const reiniciar = () => {
    setEtapa("upload")
    setArquivo(null)
    setRegistrosProcessados([])
    setErrosProcessamento([])
    setRegistrosSelecionados([])
    setError("")
    setSuccess("")
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Importação em Lote</h1>
          <p className="mt-2 text-gray-600">Importe múltiplos registros usando uma planilha Excel ou CSV</p>
        </div>

        {/* Indicador de Progresso */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${etapa === "upload" ? "text-blue-600" : "text-green-600"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  etapa === "upload" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                }`}
              >
                1
              </div>
              <span className="ml-2 font-medium">Upload</span>
            </div>

            <div
              className={`flex-1 h-1 mx-4 ${
                ["revisao", "processando", "concluido"].includes(etapa) ? "bg-green-200" : "bg-gray-200"
              }`}
            />

            <div
              className={`flex items-center ${
                etapa === "revisao"
                  ? "text-blue-600"
                  : ["processando", "concluido"].includes(etapa)
                    ? "text-green-600"
                    : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  etapa === "revisao"
                    ? "bg-blue-100 text-blue-600"
                    : ["processando", "concluido"].includes(etapa)
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                2
              </div>
              <span className="ml-2 font-medium">Revisão</span>
            </div>

            <div
              className={`flex-1 h-1 mx-4 ${
                ["processando", "concluido"].includes(etapa) ? "bg-green-200" : "bg-gray-200"
              }`}
            />

            <div
              className={`flex items-center ${
                etapa === "processando" ? "text-blue-600" : etapa === "concluido" ? "text-green-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  etapa === "processando"
                    ? "bg-blue-100 text-blue-600"
                    : etapa === "concluido"
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                3
              </div>
              <span className="ml-2 font-medium">Importação</span>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo por Etapa */}
        {etapa === "upload" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Faça upload da sua planilha</h3>
              <p className="text-gray-600 mb-6">
                Selecione um arquivo Excel (.xlsx, .xls) ou CSV com os dados dos registros
              </p>

              {/* Botão Download Template */}
              <div className="mb-6">
                <button
                  onClick={downloadTemplate}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template
                </button>
                <p className="text-xs text-gray-500 mt-2">Baixe o template para ver o formato correto dos dados</p>
              </div>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <FileText className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Clique para selecionar arquivo</span>
                  <span className="text-xs text-gray-500 mt-1">ou arraste e solte aqui</span>
                </label>
              </div>

              {arquivo && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{arquivo.name}</span>
                    <button onClick={() => setArquivo(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{(arquivo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}

              {arquivo && (
                <div className="mt-6">
                  <button
                    onClick={processarPlanilha}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Processando..." : "Processar Planilha"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {etapa === "revisao" && (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumo do Processamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{registrosProcessados.length}</div>
                  <div className="text-sm text-green-700">Registros Válidos</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{errosProcessamento.length}</div>
                  <div className="text-sm text-red-700">Linhas com Erro</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{registrosSelecionados.length}</div>
                  <div className="text-sm text-blue-700">Selecionados</div>
                </div>
              </div>
            </div>

            {/* Erros */}
            {errosProcessamento.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 text-red-600">Linhas com Erro</h3>
                <div className="space-y-2">
                  {errosProcessamento.map((erro, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded border border-red-200">
                      <div className="text-sm font-medium text-red-800">
                        Linha {erro.linha}: {erro.erro}
                      </div>
                      {erro.dados && (
                        <div className="text-xs text-red-600 mt-1">Dados: {JSON.stringify(erro.dados)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registros Válidos */}
            {registrosProcessados.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Registros para Importação</h3>
                    <button onClick={selecionarTodos} className="text-sm text-blue-600 hover:text-blue-800">
                      {registrosSelecionados.length === registrosProcessados.length
                        ? "Desmarcar Todos"
                        : "Selecionar Todos"}
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {registrosProcessados.map((registro, index) => (
                    <div key={registro.id_temp} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          checked={registrosSelecionados.includes(registro.id_temp)}
                          onChange={() => toggleRegistroSelecionado(registro.id_temp)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{registro.titulo}</h4>
                          <p className="text-sm text-gray-600 mt-1">{registro.descricao}</p>
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Tipo: {registro.tipo_registro}</span>
                            <span>Data: {registro.data_registro}</span>
                            {registro.classificacao_grupo && <span>Classificação: {registro.classificacao_grupo}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 border-t border-gray-200">
                  <div className="flex justify-between">
                    <button
                      onClick={reiniciar}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={finalizarImportacao}
                      disabled={loading || registrosSelecionados.length === 0}
                      className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? "Importando..." : `Importar ${registrosSelecionados.length} Registro(s)`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {etapa === "processando" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importando Registros...</h3>
              <p className="text-gray-600">Por favor, aguarde enquanto os registros são criados no sistema.</p>
            </div>
          </div>
        )}

        {etapa === "concluido" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importação Concluída!</h3>
              <p className="text-gray-600 mb-6">Os registros foram importados com sucesso para o sistema.</p>
              <div className="space-x-4">
                <button
                  onClick={reiniciar}
                  className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Nova Importação
                </button>
                <button
                  onClick={() => (window.location.href = "/registros")}
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Ver Registros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportacaoLote
