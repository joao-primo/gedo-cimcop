"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { dashboardAPI } from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  TrendingUp,
  Clock,
  RefreshCw,
  Building2,
  User,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  AlertTriangle,
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
import { Bar, Pie, Line } from "react-chartjs-2"

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

  const carregarDados = async () => {
    try {
      console.log("Carregando dados do dashboard...")
      setDados((prev) => ({ ...prev, loading: true, error: "" }))

      // Carregar dados em paralelo
      const promises = [
        dashboardAPI.getEstatisticas().catch((err) => {
          console.error("Erro ao carregar estatísticas:", err)
          return { data: {} }
        }),
        dashboardAPI.getAtividadesRecentes(8).catch((err) => {
          console.error("Erro ao carregar atividades:", err)
          return { data: { atividades_recentes: [] } }
        }),
        dashboardAPI.getTimeline(30).catch((err) => {
          console.error("Erro ao carregar timeline:", err)
          return { data: { timeline: [] } }
        }),
      ]

      const [estatisticasRes, atividadesRes, timelineRes] = await Promise.all(promises)

      console.log("Dados carregados:", {
        estatisticas: estatisticasRes.data,
        atividades: atividadesRes.data.atividades_recentes,
        timeline: timelineRes.data.timeline,
      })

      setDados({
        estatisticas: estatisticasRes.data || {},
        atividades: atividadesRes.data.atividades_recentes || [],
        timeline: timelineRes.data.timeline || [],
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
      carregarDados()
    }
  }, [user])

  // Configurações dos gráficos
  const graficoTiposConfig = {
    data: {
      labels: dados.estatisticas.registros_por_tipo?.map((item) => item.tipo) || [],
      datasets: [
        {
          label: "Registros",
          data: dados.estatisticas.registros_por_tipo?.map((item) => item.count) || [],
          backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        title: {
          display: false,
        },
      },
    },
  }

  const graficoTimelineConfig = {
    data: {
      labels: dados.timeline?.map((item) => new Date(item.data).toLocaleDateString("pt-BR")) || [],
      datasets: [
        {
          label: "Registros por Dia",
          data: dados.timeline?.map((item) => item.count) || [],
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  }

  const graficoObrasConfig = {
    data: {
      labels: dados.estatisticas.registros_por_obra?.map((item) => item.obra_nome) || [],
      datasets: [
        {
          label: "Registros por Obra",
          data: dados.estatisticas.registros_por_obra?.map((item) => item.count) || [],
          backgroundColor: "#10B981",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
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

  // Se não há usuário, mostrar mensagem
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
      {/* Header Moderno */}
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
        <Button onClick={carregarDados} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
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
            <p className="text-xs text-gray-500 mt-1">Todos os registros</p>
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
            <CardTitle className="text-sm font-medium text-gray-600">Tipos Ativos</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{dados.estatisticas.registros_por_tipo?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Tipos diferentes</p>
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
              {dados.timeline?.length > 0
                ? Math.round(dados.timeline.reduce((acc, item) => acc + item.count, 0) / dados.timeline.length)
                : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Registros/dia</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Atividade dos Últimos 30 Dias
            </CardTitle>
            <CardDescription>Registros criados por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {dados.timeline?.length > 0 ? (
              <div className="h-64">
                <Line {...graficoTimelineConfig} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
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
              <PieChart className="h-5 w-5 mr-2 text-green-600" />
              Distribuição por Tipo
            </CardTitle>
            <CardDescription>Registros por tipo de documento</CardDescription>
          </CardHeader>
          <CardContent>
            {dados.estatisticas.registros_por_tipo?.length > 0 ? (
              <div className="h-64">
                <Pie {...graficoTiposConfig} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum dado disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Obras (apenas admin) */}
      {isAdmin() && dados.estatisticas.registros_por_obra?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-purple-600" />
              Registros por Obra
            </CardTitle>
            <CardDescription>Distribuição de registros entre as obras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar {...graficoObrasConfig} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Atividades Recentes Melhoradas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Atividades Recentes
          </CardTitle>
          <CardDescription>Últimos registros criados no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {dados.atividades.length === 0 ? (
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
                        <h4 className="text-base font-semibold text-gray-900 mb-1">{atividade.titulo}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {atividade.tipo_registro}
                          </Badge>
                          {isAdmin() && atividade.obra_id && (
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              Obra #{atividade.obra_id}
                            </span>
                          )}
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {atividade.autor_nome || `Autor #${atividade.autor_id}`}
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
