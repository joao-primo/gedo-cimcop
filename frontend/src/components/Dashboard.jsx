"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { FileText, TrendingUp, Calendar, AlertCircle, CheckCircle, Clock, Activity } from "lucide-react"

const Dashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [estatisticas, setEstatisticas] = useState({
    total_registros: 0,
    registros_ultimos_30d: 0,
    registros_por_tipo: [],
    registros_por_classificacao: [],
    registros_por_obra: [],
    registros_anexos: { com_anexo: 0, sem_anexo: 0 },
  })
  const [atividadesRecentes, setAtividadesRecentes] = useState([])
  const [timeline, setTimeline] = useState([])

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("token")
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      // Carregar estatísticas
      try {
        const estatisticasResponse = await fetch("/api/dashboard/estatisticas", { headers })
        if (estatisticasResponse.ok) {
          const estatisticasData = await estatisticasResponse.json()
          setEstatisticas(estatisticasData)
        } else {
          console.warn("Erro ao carregar estatísticas:", estatisticasResponse.status)
          // Manter valores padrão
        }
      } catch (err) {
        console.warn("Erro na requisição de estatísticas:", err)
      }

      // Carregar atividades recentes
      try {
        const atividadesResponse = await fetch("/api/dashboard/atividades-recentes?limit=5", { headers })
        if (atividadesResponse.ok) {
          const atividadesData = await atividadesResponse.json()
          setAtividadesRecentes(atividadesData.atividades_recentes || [])
        } else {
          console.warn("Erro ao carregar atividades:", atividadesResponse.status)
        }
      } catch (err) {
        console.warn("Erro na requisição de atividades:", err)
      }

      // Carregar timeline
      try {
        const timelineResponse = await fetch("/api/dashboard/timeline?dias=30", { headers })
        if (timelineResponse.ok) {
          const timelineData = await timelineResponse.json()
          setTimeline(timelineData.timeline || [])
        } else {
          console.warn("Erro ao carregar timeline:", timelineResponse.status)
        }
      } catch (err) {
        console.warn("Erro na requisição de timeline:", err)
      }
    } catch (err) {
      console.error("Erro geral ao carregar dashboard:", err)
      setError("Erro ao carregar dados do dashboard")
    } finally {
      setLoading(false)
    }
  }

  // Cores para os gráficos
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"]

  // Cards de estatísticas
  const StatCard = ({ title, value, icon: Icon, color = "blue", subtitle }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-lg bg-gray-200 w-12 h-12"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
          <button onClick={carregarDados} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Bem-vindo, {user?.username}! Aqui está um resumo das atividades.</p>
        </div>
        <button
          onClick={carregarDados}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Activity className="h-4 w-4 mr-2" />
          Atualizar
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Registros"
          value={estatisticas.total_registros.toLocaleString()}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Últimos 30 Dias"
          value={estatisticas.registros_ultimos_30d.toLocaleString()}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Com Anexos"
          value={estatisticas.registros_anexos.com_anexo.toLocaleString()}
          icon={CheckCircle}
          color="purple"
          subtitle={`${estatisticas.registros_anexos.sem_anexo} sem anexos`}
        />
        <StatCard title="Atividades Hoje" value={atividadesRecentes.length} icon={Clock} color="orange" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Registros por Tipo */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Registros por Tipo</h3>
          {estatisticas.registros_por_tipo.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estatisticas.registros_por_tipo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">Nenhum dado disponível</div>
          )}
        </div>

        {/* Gráfico de Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Atividade dos Últimos 30 Dias</h3>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">Nenhum dado disponível</div>
          )}
        </div>
      </div>

      {/* Gráficos de Classificação e Obras (se disponíveis) */}
      {(estatisticas.registros_por_classificacao.length > 0 || estatisticas.registros_por_obra.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Classificações */}
          {estatisticas.registros_por_classificacao.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Registros por Classificação</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={estatisticas.registros_por_classificacao}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grupo, percent }) => `${grupo} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {estatisticas.registros_por_classificacao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico de Obras (apenas para admin) */}
          {user?.role === "administrador" && estatisticas.registros_por_obra.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Registros por Obra</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={estatisticas.registros_por_obra}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="obra_nome" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Atividades Recentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Atividades Recentes</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {atividadesRecentes.length > 0 ? (
            atividadesRecentes.map((atividade, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{atividade.titulo}</p>
                    <p className="text-sm text-gray-500 truncate">{atividade.descricao}</p>
                    <div className="mt-1 flex items-center text-xs text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(atividade.created_at).toLocaleDateString("pt-BR")}
                      {atividade.obra && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{atividade.obra.nome}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {atividade.tipo_registro}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma atividade recente</h3>
              <p className="mt-1 text-sm text-gray-500">Quando houver novos registros, eles aparecerão aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
