import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BarChart3, FileText, TrendingUp, Calendar, Construction, Info } from "lucide-react"

const Relatorios = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios</h1>
          <p className="text-gray-600">Análises detalhadas e relatórios personalizados do sistema</p>
        </div>

        {/* Aviso de Desenvolvimento */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Funcionalidade em Desenvolvimento</strong>
            <br />
            Esta seção está sendo desenvolvida e em breve estará disponível com relatórios completos e análises
            avançadas.
          </AlertDescription>
        </Alert>

        {/* Preview dos Relatórios Futuros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Relatório de Atividades */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Relatório de Atividades
              </CardTitle>
              <CardDescription>Análise detalhada das atividades por período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Registros por mês</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tendências de crescimento</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Comparativo anual</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relatório por Classificação */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600" />
                Relatório por Classificação
              </CardTitle>
              <CardDescription>Distribuição de registros por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Atividades em Campo</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recursos e Logística</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Planejamento</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relatório de Performance */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                Relatório de Performance
              </CardTitle>
              <CardDescription>Indicadores de desempenho do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tempo médio de resposta</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Taxa de utilização</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Eficiência operacional</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relatório Temporal */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-orange-600" />
                Relatório Temporal
              </CardTitle>
              <CardDescription>Análise de registros ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sazonalidade</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Picos de atividade</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Previsões</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relatório por Obra */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Construction className="h-5 w-5 mr-2 text-red-600" />
                Relatório por Obra
              </CardTitle>
              <CardDescription>Comparativo entre diferentes obras</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Produtividade por obra</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Comparativo de custos</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status de progresso</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relatório Personalizado */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                Relatórios Personalizados
              </CardTitle>
              <CardDescription>Crie relatórios sob medida</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Filtros avançados</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Exportação PDF/Excel</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Agendamento automático</span>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações Adicionais */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Próximas Funcionalidades</CardTitle>
            <CardDescription>Recursos que serão implementados na seção de relatórios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Relatórios Automáticos</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Geração automática de relatórios mensais</li>
                  <li>• Envio por email para gestores</li>
                  <li>• Alertas de anomalias e tendências</li>
                  <li>• Dashboard executivo personalizado</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Análises Avançadas</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Análise preditiva de tendências</li>
                  <li>• Comparativos históricos detalhados</li>
                  <li>• Métricas de produtividade por equipe</li>
                  <li>• Indicadores de qualidade e eficiência</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Relatorios
