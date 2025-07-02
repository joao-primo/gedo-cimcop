"use client"
import { useAuth } from "../contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  LogOut,
  Home,
  FileText,
  Search,
  Users,
  Settings,
  PlusCircle,
  Menu,
  X,
  WorkflowIcon,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useState } from "react"

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Registros", href: "/registros", icon: FileText },
    { name: "Pesquisa", href: "/pesquisa", icon: Search },
    { name: "Configurações", href: "/configuracoes", icon: Settings },
    ...(isAdmin()
      ? [
          { name: "Obras", href: "/obras", icon: Building2 },
          { name: "Usuários", href: "/usuarios", icon: Users },
          { name: "Workflow", href: "/workflow", icon: WorkflowIcon },
        ]
      : []),
  ]

  const isActive = (href) => location.pathname === href

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="lg:hidden mr-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              <div className="flex-shrink-0 flex items-center">
                <Building2 className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">GEDO CIMCOP</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  Olá, <span className="font-medium">{user?.username}</span>
                </span>
                <Badge variant={user?.role === "administrador" ? "default" : "secondary"}>
                  {user?.role === "administrador" ? "Admin" : "Usuário"}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="text-gray-500 hover:text-gray-700">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:ml-2 sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav
          className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 transition-transform duration-200 ease-in-out
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white shadow-sm min-h-screen border-r
        `}
        >
          <div className="p-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${
                        isActive(item.href)
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }
                    `}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações Rápidas</h3>
              <div className="mt-2 space-y-1">
                <Link
                  to="/registros/novo"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <PlusCircle className="mr-3 h-5 w-5" />
                  Novo Registro
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 lg:ml-0">{children}</main>
      </div>
    </div>
  )
}

export default Layout
