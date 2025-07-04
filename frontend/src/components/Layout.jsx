"use client"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate, useLocation, Outlet } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Home,
  FileText,
  Search,
  Building2,
  Settings,
  Users,
  Upload,
  LogOut,
  User,
  ChevronDown,
  BarChart3,
  FileType,
  Key,
  Workflow,
  BarChart2,
} from "lucide-react"

const Layout = () => {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    )
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  // Menu items baseado no papel do usuário
  const menuItems = [
    {
      title: "Dashboard",
      icon: Home,
      path: "/dashboard",
      description: "Visão geral do sistema",
    },
    {
      title: "Novo Registro",
      icon: FileText,
      path: "/registros/novo",
      description: "Criar novo registro",
    },
    {
      title: "Pesquisa",
      icon: Search,
      path: "/pesquisa",
      description: "Pesquisa avançada",
    },
    // ✅ NOVO: Item de menu para Relatórios
    {
      title: "Relatórios",
      icon: BarChart2,
      path: "/relatorios",
      description: "Relatórios e análises",
    },
  ]

  // Menu items apenas para admin
  const adminMenuItems = [
    {
      title: "Obras",
      icon: Building2,
      path: "/obras",
      description: "Gerenciar obras",
    },
    {
      title: "Usuários",
      icon: Users,
      path: "/usuarios",
      description: "Gerenciar usuários",
    },
    {
      title: "Tipos de Registro",
      icon: FileType,
      path: "/tipos-registro",
      description: "Gerenciar tipos",
    },
    {
      title: "Importação",
      icon: Upload,
      path: "/importacao",
      description: "Importação em lote",
    },
    {
      title: "Workflow",
      icon: Workflow,
      path: "/workflow",
      description: "Configurar workflow",
    },
    {
      title: "Configurações",
      icon: Settings,
      path: "/configuracoes",
      description: "Configurações do sistema",
    },
  ]

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <BarChart3 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">GEDO CIMCOP</span>
                  <span className="truncate text-xs text-muted-foreground">Sistema de Gestão</span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* Menu Principal */}
          <SidebarGroup>
            <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.description}>
                      <button onClick={() => navigate(item.path)} className="w-full">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Menu Administrativo */}
          {isAdmin() && (
            <SidebarGroup>
              <SidebarGroupLabel>Administração</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminMenuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.description}>
                        <button onClick={() => navigate(item.path)} className="w-full">
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-blue-600 text-white">
                        {getInitials(user?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.username}</span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                    <ChevronDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-blue-600 text-white">
                          {getInitials(user?.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.username}</span>
                        <span className="truncate text-xs">{user?.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <div className="px-2 py-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>Papel:</span>
                      <Badge variant={user?.role === "administrador" ? "default" : "secondary"} className="text-xs">
                        {user?.role === "administrador" ? "Admin" : "Usuário"}
                      </Badge>
                    </div>
                    {user?.role === "usuario_padrao" && user?.obra_id && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Building2 className="h-3 w-3" />
                        <span>Obra:</span>
                        <Badge variant="outline" className="text-xs">
                          #{user.obra_id}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => navigate("/trocar-senha")}>
                    <Key className="mr-2 h-4 w-4" />
                    Trocar Senha
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>GEDO CIMCOP</span>
            <span>•</span>
            <span>Sistema de Gestão de Documentos</span>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
