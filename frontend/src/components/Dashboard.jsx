"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Activity, FileText, Clock, TrendingUp, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import api from "../services/api"

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    total_registros: 0,
    registros_ultimos_30_dias: 0,
    registros_com_anexo: 0,
    media_diaria: 0,
  })
  const [timelineData, setTimelineData] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState("all")
  const [topTipos, setTopTipos] = useState([])

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Buscar estatísticas
      try {
        const statsResponse = await api.get("/dashboard/estatisticas")
        if (statsResponse.data) {
          setStats(statsResponse.data)
        }
      } catch (error) {
        console.warn("Erro ao carregar estatísticas:", error)
        setStats({
          total_registros: 0,
          registros_ultimos_30_dias: 0,
          registros_com_anexo: 0,
          media_diaria: 0,
        })
      }

      // Buscar timeline
      try {
        const timelineUrl =
          selectedObra === "all" ? "/dashboard/timeline?dias=30" : `/dashboard/timeline?dias=30&obra_id=${selectedObra}`
        const timelineResponse = await api.get(timelineUrl)
        if (timelineResponse.data) {
          setTimelineData(timelineResponse.data)
        }
      } catch (error) {
        console.warn("Erro ao carregar timeline:", error)
        setTimelineData([])
      }

      // Buscar atividades recentes
      try {
        const activitiesResponse = await api.get("/dashboard/atividades-recentes?limit=5")
        if (activitiesResponse.data) {
          setRecentActivities(activitiesResponse.data)
        }
      } catch (error) {
        console.warn("Erro ao carregar atividades:", error)
        setRecentActivities([])
      }

      // Buscar obras para filtro
      try {
        const obrasResponse = await api.get("/obras/")
        if (obrasResponse.data) {
          setObras(obrasResponse.data)
        }
      } catch (error) {
        console.warn("Erro ao carregar obras:", error)
        setObras([])
      }

      // Buscar top tipos de registro
      try {
        const topTiposResponse = await api.get("/dashboard/top-tipos-registro")
        if (topTiposResponse.data) {
          setTopTipos(topTiposResponse.data)
        }
      } catch (error) {
        console.warn("Erro ao carregar top tipos:", error)
        setTopTipos([])
      }
    } catch (error) {
      console.error("Erro geral no dashboard:", error)
      toast.error("Erro ao carregar dados do dashboard")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  const handleObraChange = (value) => {
    setSelectedObra(value)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [selectedObra])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral do sistema</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedObra} onValueChange={handleObraChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as obras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {obras.map((obra) => (
                <SelectItem key={obra.id} value={obra.id.toString()}>
                  {obra.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_registros}</div>
            <p className="text-xs text-muted-foreground">Total no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimos 30 Dias</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.registros_ultimos_30_dias}</div>
            <p className="text-xs text-muted-foreground">Registros recentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros com Anexo</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.registros_com_anexo}</div>
            <p className="text-xs text-muted-foreground">Com arquivos anexos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.media_diaria}</div>
            <p className="text-xs text-muted-foreground">Registros por dia</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Atividade dos Últimos 30 Dias */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade dos Últimos 30 Dias</CardTitle>
            <p className="text-sm text-muted-foreground">Registros criados por dia</p>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="registros" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum dado disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Tipos de Registro */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Tipos de Registro</CardTitle>
            <p className="text-sm text-muted-foreground">Os 10 tipos com mais registros</p>
          </CardHeader>
          <CardContent>
            {topTipos.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topTipos}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {topTipos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum dado disponível</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <p className="text-sm text-muted-foreground">Últimas 5 atividades criadas no sistema</p>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.descricao || "Registro sem descrição"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.obra_nome} • {activity.tipo_nome}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {new Date(activity.data_registro).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma atividade recente</p>
              <p className="text-sm">Quando novos registros forem criados, eles aparecerão aqui</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
