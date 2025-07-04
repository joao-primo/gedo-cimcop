"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { Toaster } from "@/components/ui/sonner"
import Layout from "./components/Layout"
import Login from "./components/Login"
import Dashboard from "./components/Dashboard"
import Usuario from "./components/Usuario"
import Obras from "./components/Obras"
import Configuracoes from "./components/Configuracoes"
import Workflow from "./components/Workflow"
import Pesquisa from "./components/Pesquisa"
import ImportacaoLote from "./components/ImportacaoLote"
import RegistroForm from "./components/RegistroForm"
import Relatorios from "./components/Relatorios"
import ForgotPassword from "./components/ForgotPassword"
import ResetPassword from "./components/ResetPassword"
import TrocarSenha from "./components/TrocarSenha"
import { useAuth } from "./contexts/AuthContext"
import "./App.css"

// Componente para proteger rotas que precisam de autenticação
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

// Componente para rotas que só devem ser acessadas quando não logado
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" replace /> : children
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Rotas públicas (apenas quando não logado) */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              }
            />

            {/* Rotas protegidas (apenas quando logado) */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/novo-registro" element={<RegistroForm />} />
                      <Route path="/pesquisa" element={<Pesquisa />} />
                      <Route path="/importacao" element={<ImportacaoLote />} />
                      <Route path="/relatorios" element={<Relatorios />} />
                      <Route path="/usuarios" element={<Usuario />} />
                      <Route path="/obras" element={<Obras />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="/workflow" element={<Workflow />} />
                      <Route path="/trocar-senha" element={<TrocarSenha />} />
                      {/* Rota 404 para páginas não encontradas */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
