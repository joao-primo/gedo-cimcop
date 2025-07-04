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
        path="/registros/novo"
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

      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <Layout>
              <Configuracoes />
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
    <Router>
      <AuthProvider>
        <div className="App">
          <AppContent />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
