import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  Package, 
  Wrench, 
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function Dashboard() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: employees } = trpc.employees.listActive.useQuery();
  const { data: components } = trpc.components.list.useQuery();
  const { data: lowStockComponents } = trpc.components.getLowStock.useQuery();
  const { data: serviceOrders } = trpc.serviceOrders.list.useQuery();
  
  const { data: monthlyReport } = trpc.reports.monthly.useQuery({ 
    year: currentYear, month: currentMonth 
  });
  const { data: yearlyReport } = trpc.reports.yearly.useQuery({ year: currentYear });
  const { data: categoryReport } = trpc.reports.byCategory.useQuery({ 
    year: currentYear, month: currentMonth 
  });
  const { data: customerReport } = trpc.reports.byCustomer.useQuery({ 
    year: currentYear, month: currentMonth 
  });

  const openOrders = serviceOrders?.filter(o => 
    ["aberto", "aguardando_componente", "em_reparo", "aprovado"].includes(o.status)
  ).length || 0;

  const completedOrders = serviceOrders?.filter(o => {
    if (!["entregue", "pago"].includes(o.status)) return false;
    if (!o.completedDate) return false;
    const compDate = new Date(o.completedDate);
    return compDate.getMonth() + 1 === currentMonth && compDate.getFullYear() === currentYear;
  }).length || 0;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Função BLINDADA contra erros de tipo
  const formatCurrency = (value: any) => {
    const num = Number(value);
    return `R$ ${isNaN(num) ? "0.00" : num.toFixed(2)}`;
  };

  const safeYearlyData = yearlyReport?.map(report => ({
    name: new Date(currentYear, report.month - 1).toLocaleString('pt-BR', { month: 'short' }),
    Receita: Number(report.totalRevenue || 0),
    Despesas: Number(report.totalExpenses || 0),
  })) || [];

  const safeCategoryData = categoryReport?.map(item => ({
    name: item.name,
    value: Number(item.value)
  })) || [];

  const safeCustomerData = customerReport?.map(item => ({
    name: item.name,
    Receita: Number(item.value)
  })) || [];

  // ESTILO DO TOOLTIP PARA TEMA ESCURO (Alto Contraste)
  const tooltipStyle = {
    backgroundColor: '#1e293b', // Slate-800
    borderColor: '#334155',     // Slate-700
    color: '#f8fafc',           // Slate-50
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  const tooltipItemStyle = {
    color: '#e2e8f0' // Slate-200
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de gestão</p>
        </div>

        {/* 1. TOPO: Detalhes Financeiros e Alertas (Prioridade) */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes Financeiros</CardTitle>
              <CardDescription>Resumo do mês de {currentMonth}/{currentYear}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Receitas</span>
                <span className="text-lg font-bold text-success">
                  {formatCurrency(monthlyReport?.totalRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Despesas</span>
                <span className="text-lg font-bold text-destructive">
                  {formatCurrency(monthlyReport?.totalExpenses)}
                </span>
              </div>
              <div className="border-t pt-4 flex items-center justify-between">
                <span className="text-sm font-bold">Lucro Líquido</span>
                <span className={`text-xl font-bold ${(monthlyReport?.netProfit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(monthlyReport?.netProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Alertas e Pendências</CardTitle>
              <CardDescription>Itens que requerem atenção</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {(lowStockComponents || []).length > 0 ? (
                <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Estoque Baixo</p>
                    <p className="text-xs text-muted-foreground">
                      {(lowStockComponents || []).length} itens abaixo do mínimo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-2">
                  <p className="text-sm">Nenhum alerta crítico</p>
                  <p className="text-xs opacity-70">Sistema operando normalmente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 2. MEIO: Indicadores Chave (KPIs) - Linha Compacta */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Componentes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{components?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Em estoque</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordens Abertas</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openOrders}</div>
              <p className="text-xs text-muted-foreground">{completedOrders} concluídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthlyReport?.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Mês atual</p>
            </CardContent>
          </Card>
        </div>

        {/* 3. BAIXO: Gráficos (Sem espaços vazios) */}
        <div className="space-y-4">
          {/* Gráfico de Barras: Fluxo de Caixa (Largura Total) */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa ({currentYear})</CardTitle>
              <CardDescription>Comparativo mensal de Entradas e Saídas</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={safeYearlyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Legend />
                    <Bar dataKey="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Linha Inferior: Pizza + Top Clientes (50% cada) */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Categorias */}
            <Card>
              <CardHeader>
                <CardTitle>Receita por Categoria</CardTitle>
                <CardDescription>Distribuição deste mês</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {safeCategoryData.length > 0 ? (
                  <div className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={safeCategoryData}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {safeCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={tooltipStyle}
                          itemStyle={tooltipItemStyle}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Sem dados para este mês
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NOVO: Top Clientes */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Clientes</CardTitle>
                <CardDescription>Maiores receitas do mês</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {safeCustomerData.length > 0 ? (
                  <div className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={safeCustomerData} layout="vertical" margin={{ left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={100} 
                          tick={{fontSize: 11}} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={tooltipStyle}
                          itemStyle={tooltipItemStyle}
                          cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        />
                        <Bar dataKey="Receita" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Sem dados para este mês
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}