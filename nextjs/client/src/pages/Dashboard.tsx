import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  Package, 
  Wrench, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ShoppingCart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: employees } = trpc.employees.listActive.useQuery();
  const { data: components } = trpc.components.list.useQuery();
  const { data: lowStockComponents } = trpc.components.getLowStock.useQuery();
  const { data: serviceOrders } = trpc.serviceOrders.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: monthlyReport } = trpc.reports.monthly.useQuery({ 
    year: currentYear, 
    month: currentMonth 
  });

  const openOrders = serviceOrders?.filter(o => 
    ["aberto", "aguardando_componente", "em_reparo"].includes(o.status)
  ).length || 0;

  const completedOrders = serviceOrders?.filter(o => 
    ["entregue", "pago"].includes(o.status)
  ).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de gestão
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Funcionários Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Técnicos e atendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Componentes
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{components?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {lowStockComponents && lowStockComponents.length > 0 && (
                  <span className="text-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {lowStockComponents.length} com estoque baixo
                  </span>
                )}
                {(!lowStockComponents || lowStockComponents.length === 0) && "Estoque normal"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ordens Abertas
              </CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openOrders}</div>
              <p className="text-xs text-muted-foreground">
                {completedOrders} concluídas este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Mensal
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(monthlyReport?.totalRevenue || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {monthlyReport?.serviceOrdersCount || 0} serviços pagos
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
              <CardDescription>
                Mês de {currentMonth}/{currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Receitas</span>
                <span className="text-lg font-bold text-success">
                  R$ {(monthlyReport?.totalRevenue || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Despesas</span>
                <span className="text-lg font-bold text-destructive">
                  R$ {(monthlyReport?.totalExpenses || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Comissões</span>
                <span className="text-lg font-bold text-warning">
                  R$ {(monthlyReport?.totalCommissions || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-4 flex items-center justify-between">
                <span className="text-sm font-bold">Lucro Líquido</span>
                <span className={`text-xl font-bold ${(monthlyReport?.netProfit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  R$ {(monthlyReport?.netProfit || 0).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas e Pendências</CardTitle>
              <CardDescription>
                Itens que requerem atenção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockComponents && lowStockComponents.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Estoque Baixo</p>
                    <p className="text-xs text-muted-foreground">
                      {lowStockComponents.length} componente(s) com estoque abaixo do mínimo
                    </p>
                  </div>
                </div>
              )}

              {openOrders > 0 && (
                <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Wrench className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Ordens em Andamento</p>
                    <p className="text-xs text-muted-foreground">
                      {openOrders} ordem(ns) de serviço aguardando conclusão
                    </p>
                  </div>
                </div>
              )}

              {(!lowStockComponents || lowStockComponents.length === 0) && openOrders === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhum alerta no momento</p>
                  <p className="text-xs">Tudo funcionando normalmente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clientes Cadastrados</CardTitle>
            <CardDescription>
              Total de {customers?.length || 0} cliente(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{customers?.length || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Base de clientes ativa
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
