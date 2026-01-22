import { and, gte, lte, sql, eq, inArray, desc } from "drizzle-orm";
import { getDb } from "./db";
import { serviceOrders, purchaseOrders, sales, commissions, customers } from "../drizzle/schema";

export type MonthlyReport = {
  month: number;
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  totalCommissions: number;
  netProfit: number;
  serviceOrdersCount: number;
  salesCount: number;
};

// --- Relatório Mensal (Baseado nas tabelas reais) ---
export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  // 1. Receita de Serviços (Status Pago ou Entregue)
  const serviceRevenueResult = await db.select({
    total: sql<number>`SUM(${serviceOrders.totalCost})`,
    count: sql<number>`COUNT(${serviceOrders.id})`
  }).from(serviceOrders).where(
    and(
      gte(serviceOrders.updatedAt, startDate),
      lte(serviceOrders.updatedAt, endDate),
      inArray(serviceOrders.status, ["pago", "entregue"])
    )
  );

  // 2. Receita de Vendas
  const salesRevenueResult = await db.select({
    total: sql<number>`SUM(${sales.totalAmount})`,
    count: sql<number>`COUNT(${sales.id})`
  }).from(sales).where(
    and(
      gte(sales.saleDate, startDate),
      lte(sales.saleDate, endDate)
    )
  );

  // 3. Despesas (Compras que não estão pendentes/canceladas)
  const purchaseExpensesResult = await db.select({
    total: sql<number>`SUM(${purchaseOrders.totalAmount})`
  }).from(purchaseOrders).where(
    and(
      gte(purchaseOrders.orderDate, startDate),
      lte(purchaseOrders.orderDate, endDate),
      inArray(purchaseOrders.status, ["aguardando_entrega", "recebido_parcial", "recebido"])
    )
  );
  
  // 4. Comissões
  const commissionsResult = await db.select({
    total: sql<number>`SUM(${commissions.commissionAmount})`
  }).from(commissions).where(
    and(
      gte(commissions.createdAt, startDate),
      lte(commissions.createdAt, endDate)
    )
  );
  
  const revenueServices = Number(serviceRevenueResult[0]?.total || 0);
  const revenueSales = Number(salesRevenueResult[0]?.total || 0);
  
  const totalRevenue = revenueServices + revenueSales;
  const totalExpenses = Number(purchaseExpensesResult[0]?.total || 0);
  const totalCommissions = Number(commissionsResult[0]?.total || 0);
  const netProfit = totalRevenue - totalExpenses - totalCommissions;
  
  return {
    month,
    year,
    totalRevenue,
    totalExpenses,
    totalCommissions,
    netProfit,
    serviceOrdersCount: Number(serviceRevenueResult[0]?.count || 0),
    salesCount: Number(salesRevenueResult[0]?.count || 0),
  };
}

export async function getYearlyReport(year: number): Promise<MonthlyReport[]> {
  const reports: MonthlyReport[] = [];
  for (let month = 1; month <= 12; month++) {
    const report = await getMonthlyReport(year, month);
    reports.push(report);
  }
  return reports;
}

// --- GRÁFICO 1: Receita por Categoria (Sem Transactions) ---
export async function getRevenueByCategory(year: number, month: number) {
    const db = await getDb();
    if (!db) return [];
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Busca total de Serviços
    const services = await db.select({ value: sql<number>`SUM(${serviceOrders.totalCost})` })
      .from(serviceOrders)
      .where(and(
        gte(serviceOrders.updatedAt, startDate),
        lte(serviceOrders.updatedAt, endDate),
        inArray(serviceOrders.status, ["pago", "entregue"])
      ));

    // 2. Busca total de Vendas
    const productSales = await db.select({ value: sql<number>`SUM(${sales.totalAmount})` })
      .from(sales)
      .where(and(
        gte(sales.saleDate, startDate),
        lte(sales.saleDate, endDate)
      ));

    // Retorna array formatado para o gráfico
    return [
        { name: "Serviços", value: Number(services[0]?.value || 0) },
        { name: "Vendas", value: Number(productSales[0]?.value || 0) }
    ].filter(item => item.value > 0); // Opcional: esconder se for 0
}

// --- GRÁFICO 2: Receita por Cliente (Sem Transactions) ---
export async function getRevenueByCustomer(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Como Drizzle não facilita UNIONs complexos, faremos em 2 passos e uniremos no código:
  
  // 1. Clientes via Serviços
  const serviceCustomers = await db
    .select({
      id: customers.id,
      name: customers.name,
      value: sql<number>`SUM(${serviceOrders.totalCost})`
    })
    .from(serviceOrders)
    .innerJoin(customers, eq(serviceOrders.customerId, customers.id))
    .where(and(
      gte(serviceOrders.updatedAt, startDate),
      lte(serviceOrders.updatedAt, endDate),
      inArray(serviceOrders.status, ["pago", "entregue"])
    ))
    .groupBy(customers.id, customers.name);

  // 2. Clientes via Vendas
  const salesCustomers = await db
    .select({
      id: customers.id,
      name: customers.name,
      value: sql<number>`SUM(${sales.totalAmount})`
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .where(and(
      gte(sales.saleDate, startDate),
      lte(sales.saleDate, endDate)
    ))
    .groupBy(customers.id, customers.name);

  // 3. Unir e Somar
  const customerMap = new Map<number, { name: string, value: number }>();

  // Adiciona serviços
  for (const c of serviceCustomers) {
    const val = Number(c.value);
    if (val > 0) customerMap.set(c.id, { name: c.name, value: val });
  }

  // Adiciona vendas (soma se já existir)
  for (const c of salesCustomers) {
    const val = Number(c.value);
    if (val > 0) {
      const existing = customerMap.get(c.id);
      if (existing) {
        existing.value += val;
      } else {
        customerMap.set(c.id, { name: c.name, value: val });
      }
    }
  }

  // 4. Converter para array, ordenar e pegar Top 5
  return Array.from(customerMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}