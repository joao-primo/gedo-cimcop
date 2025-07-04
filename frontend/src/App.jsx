"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import Login from "./components/Login"
import Layout from "./components/Layout"
import Dashboard from "./components/Dashboard"
import RegistroForm from "./components/RegistroForm"
import Obras from "./components/Obras"
import Usuario from "./components/Usuario"
import TrocarSenha from "./components/TrocarSenha"
import Pesquisa from "./components/Pesquisa"
import Configuracoes from "./components/Configuracoes"
import Workflow from "./components/Workflow"
import "./App.css"

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando GEDO CIMCOP...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  // Verificar se deve trocar senha (exceto se já estiver na página de trocar senha)
  if (user.must_change_password && window.location.pathname !== "/trocar-senha") {
    return <Navigate to="/trocar-senha" />
  }

  return children
}

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  // Verificar se deve trocar senha primeiro
  if (user.must_change_password) {
    return <Navigate to="/trocar-senha" />
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />
  }

  return children
}

// ✅ NOVO: Componente de Relatórios
const Relatorios = () => {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Módulo de Relatórios</h1>
        <p className="text-lg text-gray-600 mb-6">Em Desenvolvimento</p>
        <div className="max-w-2xl mx-auto text-left">
          <h2 className="text-xl font-semibold mb-4">Funcionalidades Planejadas:</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              Relatórios por período (diário, semanal, mensal)
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              Relatórios por obra específica
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              Relatórios por classificação hierárquica
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              Gráficos avançados e análises estatísticas
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              Exportação em PDF com formatação profissional
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              Agendamento automático de relatórios
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              Dashboard executivo com KPIs
            </li>
          </ul>
        </div>
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            <strong>Status:</strong> Este módulo está sendo desenvolvido e estará disponível em breve. Por enquanto,
            você pode usar a funcionalidade de <strong>Exportação Excel</strong> na página de Pesquisa.
          </p>
        </div>
      </div>
    </div>
  )
}

const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Inicializando GEDO CIMCOP...</p>
          <p className="text-gray-500 text-sm mt-2">Sistema de Gerenciamento de Documentos</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />

      <Route
        path="/trocar-senha"
        element={
          <ProtectedRoute>
            <TrocarSenha />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/registros"
        element={
          <ProtectedRoute>
            <Layout>
              <RegistroForm />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/registros/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <RegistroForm />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pesquisa"
        element={
          <ProtectedRoute>
            <Layout>
              <Pesquisa />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ✅ NOVA ROTA: Relatórios */}
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <Layout>
              <Relatorios />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Rotas administrativas */}
      <Route
        path="/obras"
        element={
          <AdminRoute>
            <Layout>
              <Obras />
            </Layout>
          </AdminRoute>
        }
      />

      <Route
        path="/usuarios"
        element={
          <AdminRoute>
            <Layout>
              <Usuario />
            </Layout>
          </AdminRoute>
        }
      />

      <Route
        path="/configuracoes"
        element={
          <AdminRoute>
            <Layout>
              <Configuracoes />
            </Layout>
          </AdminRoute>
        }
      />

      <Route
        path="/workflow"
        element={
          <AdminRoute>
            <Layout>
              <Workflow />
            </Layout>
          </AdminRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
