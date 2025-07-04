import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { Toaster } from "sonner"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminRoute from "./components/AdminRoute"
import Layout from "./components/Layout"
import Login from "./components/Login"
import ForgotPassword from "./components/ForgotPassword"
import ResetPassword from "./components/ResetPassword"
import Dashboard from "./components/Dashboard"
import RegistroForm from "./components/RegistroForm"
import Pesquisa from "./components/Pesquisa"
import Obras from "./components/Obras"
import Usuario from "./components/Usuario"
import TiposRegistro from "./components/TiposRegistro"
import ImportacaoLote from "./components/ImportacaoLote"
import Workflow from "./components/Workflow"
import Configuracoes from "./components/Configuracoes"
import TrocarSenha from "./components/TrocarSenha"

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Rotas protegidas */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="registros/novo" element={<RegistroForm />} />
              <Route path="pesquisa" element={<Pesquisa />} />
              <Route path="relatorios" element={<Relatorios />} /> {/* ✅ NOVO */}
              <Route path="trocar-senha" element={<TrocarSenha />} />
              {/* Rotas administrativas */}
              <Route
                path="obras"
                element={
                  <AdminRoute>
                    <Obras />
                  </AdminRoute>
                }
              />
              <Route
                path="usuarios"
                element={
                  <AdminRoute>
                    <Usuario />
                  </AdminRoute>
                }
              />
              <Route
                path="tipos-registro"
                element={
                  <AdminRoute>
                    <TiposRegistro />
                  </AdminRoute>
                }
              />
              <Route
                path="importacao"
                element={
                  <AdminRoute>
                    <ImportacaoLote />
                  </AdminRoute>
                }
              />
              <Route
                path="workflow"
                element={
                  <AdminRoute>
                    <Workflow />
                  </AdminRoute>
                }
              />
              <Route
                path="configuracoes"
                element={
                  <AdminRoute>
                    <Configuracoes />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Rota padrão */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "white",
                color: "black",
                border: "1px solid #e5e7eb",
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
