"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { dashboardAPI, pesquisaAPI } from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FileText,
  TrendingUp,
  Clock,
  RefreshCw,
  Building2,
  User,
  Calendar,
  BarChart3,
  Activity,
  Paperclip,
  AlertTriangle,
  Filter,
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js"
import { Bar, Line, Doughnut } from "react-chartjs-2"

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

const Dashboard = () => {
  const { user, isAdmin } = useAuth()
  const [dados, setDados] = useState({
    estatisticas: {},
    atividades: [],
    timeline: [],
    loading: true,
    error: "",
  })
  const [filtros, setFiltros] = useState({
    obras: [],
    tipos_registro: [],
    autores: [],
  })
  const [obraSelecionada, setObraSelecionada] = useState("todas")
  const [loadingFiltros, setLoadingFiltros] = useState(false)

  const carregarFiltros = async () => {
    if (isAdmin()) {
      try {
        setLoadingFiltros(true)
        console.log("Carregando filtros para dashboard...")
        const response = await pesquisaAPI.getFiltros()
        console.log("Filtros carregados:", response.data)

        setFiltros({
          obras: response.data.obras || [],
          tipos_registro: response.data.tipos_registro || [],
          autores: response.data.autores || [],
        })
      } catch (error) {
        console.error("Erro ao carregar filtros:", error)
        setFiltros({
          obras: [],
          tipos_registro: [],
          autores: [],
        })
      } finally {
        setLoadingFiltros(false)
      }
    }
  }

  const carregarDados = async (obraId = null) => {
    try {
      console.log("Carregando dados do dashboard...", obraId ? `para obra ${obraId}` : "todas as obras")
      setDados((prev) => ({ ...prev, loading: true, error: "" }))

      // Preparar parâmetros para as APIs
      const timelineParams = obraId ? `30&obra_id=${obraId}` : "30"
      const estatisticasParams = obraId ? { obra_id: obraId } : {}

      // Carregar dados em paralelo
      const promises = [
        dashboardAPI.getEstatisticas(estatisticasParams).catch((err) => {
          console.error("Erro ao carregar estatísticas:", err)
          return { data: {} }
        }),
        dashboardAPI.getAtividadesRecentes(5, obraId).catch((err) => {
          console.error("Erro ao carregar atividades:", err)
          return { data: { atividades_recentes: [] } }
        }),
        dashboardAPI.getTimeline(timelineParams).catch((err) => {
          console.error("Erro ao carregar timeline:", err)
          return { data: { timeline: [] } }
        }),
      ]

      const [estatisticasRes, atividadesRes, timelineRes] = await Promise.all(promises)

      // Processar estatísticas
      const estatisticasFiltradas = estatisticasRes.data || {}

      // Garantir que registros_por_tipo seja sempre um array e ordenar
      if (estatisticasFiltradas.registros_por_tipo && Array.isArray(estatisticasFiltradas.registros_por_tipo)) {
        estatisticasFiltradas.registros_por_tipo = estatisticasFiltradas.registros_por_tipo
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      } else {
        estatisticasFiltradas.registros_por_tipo = []
      }

      // Garantir que registros_por_classificacao seja sempre um array
      if (
        estatisticasFiltradas.registros_por_classificacao &&
        Array.isArray(estatisticasFiltradas.registros_por_classificacao)
      ) {
        estatisticasFiltradas.registros_por_classificacao = estatisticasFiltradas.registros_por_classificacao
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
      } else {
        estatisticasFiltradas.registros_por_classificacao = []
      }

      // Garantir que registros_por_obra seja sempre um array
      if (!Array.isArray(estatisticasFiltradas.registros_por_obra)) {
        estatisticasFiltradas.registros_por_obra = []
      }

      console.log("Dados carregados:", {
        estatisticas: estatisticasFiltradas,
        atividades: atividadesRes.data?.atividades_recentes || [],
        timeline: timelineRes.data?.timeline || [],
      })

      setDados({
        estatisticas: estatisticasFiltradas,
        atividades: Array.isArray(atividadesRes.data?.atividades_recentes)
          ? atividadesRes.data.atividades_recentes
          : [],
        timeline: Array.isArray(timelineRes.data?.timeline) ? timelineRes.data.timeline : [],
        loading: false,
        error: "",
      })
    } catch (error) {
      console.error("Erro geral ao carregar dashboard:", error)
      setDados((prev) => ({
        ...prev,
        loading: false,
        error: "Erro ao carregar dados do dashboard",
      }))
    }
  }

  useEffect(() => {
    if (user) {
      console.log("Usuário logado, carregando dashboard para:", user)
      if (isAdmin()) {
        carregarFiltros()
      }
      carregarDados()
    }
  }, [user])

  const handleObraChange = (value) => {
    console.log("Obra selecionada:", value)
    setObraSelecionada(value)
    const obraId = value === "todas" ? null : value
    carregarDados(obraId)
  }

  // Função para gerar gradiente de cores baseado nos valores
  const gerarGradienteAzul = (dados) => {
    if (!dados || dados.length === 0) return []

    const valores = dados.map((item) => item.count || 0)
    const maxValor = Math.max(...valores)
    const minValor = Math.min(...valores)

    if (maxValor === minValor) {
      return dados.map(() => "#3b82f6")
    }

    return dados.map((item) => {
      const valor = item.count || 0
      const intensidade = (valor - minValor) / (maxValor - minValor)
      const r = Math.round(147 - (147 - 30) * intensidade)
      const g = Math.round(197 - (197 - 64) * intensidade)
      const b = Math.round(253 - (253 - 175) * intensidade)
      return `rgb(${r}, ${g}, ${b})`
    })
  }

  // Configurações dos gráficos
  const registrosPorTipo = Array.isArray(dados.estatisticas.registros_por_tipo)
    ? dados.estatisticas.registros_por_tipo
    : []
  const registrosPorClassificacao = Array.isArray(dados.estatisticas.registros_por_classificacao)
    ? dados.estatisticas.registros_por_classificacao
    : []
  const timelineData = Array.isArray(dados.timeline) ? dados.timeline : []
  const registrosPorObra = Array.isArray(dados.estatisticas.registros_por_obra)
    ? dados.estatisticas.registros_por_obra
    : []

  const graficoTiposConfig = {
    data: {
      labels: registrosPorTipo.map((item) => item.tipo || "Sem tipo"),
      datasets: [
        {
          label: "Registros",
          data: registrosPorTipo.map((item) => item.count || 0),
          backgroundColor: gerarGradienteAzul(registrosPorTipo),
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.x} registros`,
          },
        },
      },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  }

  const graficoClassificacaoConfig = {
    data: {
      labels: registrosPorClassificacao.map((item) => item.grupo || "Sem classificação"),
      datasets: [
        {
          data: registrosPorClassificacao.map((item) => item.count || 0),
          backgroundColor: gerarGradienteAzul(registrosPorClassificacao),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 20, usePointStyle: true, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || ""
              const value = context.parsed || 0
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
              return `${label}: ${value} registros (${percentage}%)`
            },
          },
        },
      },
    },
  }

  const graficoTimelineConfig = {
    data: {
      labels: timelineData.map((item) => {
        try {
          const date = new Date(item.data)
          return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        } catch {
          return "Data inválida"
        }
      }),
      datasets: [
        {
          label: "Registros por Dia",
          data: timelineData.map((item) => item.count || 0),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (context) => {
              try {
                const index = context[0].dataIndex
                const date = new Date(timelineData[index].data)
                return date.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              } catch {
                return "Data inválida"
              }
            },
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: 45 } },
      },
    },
  }

  const graficoObrasConfig = {
    data: {
      labels: registrosPorObra.map((item) => item.obra_nome || "Obra sem nome"),
      datasets: [
        {
          label: "Registros por Obra",
          data: registrosPorObra.map((item) => item.count || 0),
          backgroundColor: "#3b82f6",
          borderRadius: 4,
          borderSkipped: false,
          barThickness: 40,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y} registros`,
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: 45, font: { size: 11 } } },
      },
      categoryPercentage: 0.7,
      barPercentage: 0.8,
    },
  }

  const formatarData = (dateString) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateString))
    } catch {
      return "Data inválida"
    }
  }

  // Loading state
  if (dados.loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Carregando dados...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Carregando...</h2>
          <p className="text-gray-600">Verificando autenticação</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Bem-vindo, <span className="font-semibold">{user?.username}</span>!
            {user?.role === "usuario_padrao" && user?.obra_id && (
              <Badge variant="secondary" className="ml-2">
                <Building2 className="h-3 w-3 mr-1" />
                Obra #{user.obra_id}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin() && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={obraSelecionada} onValueChange={handleObraChange} disabled={loadingFiltros}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={loadingFiltros ? "Carregando..." : "Filtrar por obra"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as obras</SelectItem>
                  {filtros.obras.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id.toString()}>
                      {obra.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={() => carregarDados(obraSelecionada === "todas" ? null : obraSelecionada)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {dados.error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{dados.error}</AlertDescription>
        </Alert>
      )}

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Registros</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dados.estatisticas.total_registros || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {obraSelecionada !== "todas" ? "Registros da obra selecionada" : "Todos os registros"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Últimos 30 Dias</CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dados.estatisticas.registros_ultimos_30d || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Registros recentes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Registros com Anexo</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <Paperclip className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {dados.estatisticas.registros_anexos?.com_anexo || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">De {dados.estatisticas.total_registros || 0} registros totais</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Média Diária</CardTitle>
            <div className="p-2 bg-orange-100 rounded-full">
              <Activity className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {timelineData.length > 0
                ? Math.round(timelineData.reduce((acc, item) => acc + (item.count || 0), 0) / timelineData.length)
                : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Registros/dia</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos - 4 gráficos em grid 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Atividade dos Últimos 30 Dias
            </CardTitle>
            <CardDescription>
              Registros criados por dia
              {obraSelecionada !== "todas" && (
                <span className="ml-2 text-blue-600">• Filtrado por obra selecionada</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <div className="h-80">
                <Line {...graficoTimelineConfig} />
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum dado disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Classificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Registros por Classificação
            </CardTitle>
            <CardDescription>Distribuição por grupos de classificação</CardDescription>
          </CardHeader>
          <CardContent>
            {registrosPorClassificacao.length > 0 ? (
              <div className="h-80">
                <Doughnut {...graficoClassificacaoConfig} />
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum dado disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Tipos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Top 10 Tipos de Registro
            </CardTitle>
            <CardDescription>Os 10 tipos com mais registros</CardDescription>
          </CardHeader>
          <CardContent>
            {registrosPorTipo.length > 0 ? (
              <div className="h-80">
                <Bar {...graficoTiposConfig} />
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum dado disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Obras */}
        {isAdmin() && obraSelecionada === "todas" && registrosPorObra.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                Registros por Obra
              </CardTitle>
              <CardDescription>Distribuição de registros entre as obras</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar {...graficoObrasConfig} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Atividades Recentes
          </CardTitle>
          <CardDescription>
            Últimas 5 atividades criadas no sistema
            {obraSelecionada !== "todas" && <span className="ml-2 text-blue-600">• Filtrado por obra selecionada</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!Array.isArray(dados.atividades) || dados.atividades.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Nenhuma atividade recente</h3>
              <p className="text-sm">Quando novos registros forem criados, eles aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dados.atividades.map((atividade, index) => (
                <div
                  key={atividade.id || index}
                  className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-gray-900 mb-1">
                          {atividade.titulo || "Sem título"}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {atividade.tipo_registro || "Sem tipo"}
                          </Badge>
                          {isAdmin() && atividade.obra_id && (
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              Obra #{atividade.obra_id}
                            </span>
                          )}
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {atividade.autor_nome || `Autor #${atividade.autor_id || "N/A"}`}
                          </span>
                        </div>
                        {atividade.descricao && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {atividade.descricao.length > 120
                              ? `${atividade.descricao.substring(0, 120)}...`
                              : atividade.descricao}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatarData(atividade.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
