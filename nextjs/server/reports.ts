import { and, gte, lte, sql, eq, inArray, desc } from "drizzle-orm";
import { getDb } from "./db";
import { serviceOrders, transactions, commissions, customers } from "../drizzle/schema";

export type MonthlyReport = {
  month: number;
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  totalCommissions: number;
  netProfit: number;
  serviceOrdersCount: number;
};

export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const db = await getDb();
  if (!db) {
    return {
      month, year, totalRevenue: 0, totalExpenses: 0,
      totalCommissions: 0, netProfit: 0, serviceOrdersCount: 0,
    };
  }
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const revenueResult = await db.select({
    total: sql<number>`SUM(${serviceOrders.totalCost})`,
    count: sql<number>`COUNT(${serviceOrders.id})`
  }).from(serviceOrders).where(
    and(
      gte(serviceOrders.completedDate, startDate),
      lte(serviceOrders.completedDate, endDate),
      inArray(serviceOrders.status, ["entregue", "pago"] as any[])
    )
  );
  
  const totalRevenue = Number(revenueResult[0]?.total || 0);
  const serviceOrdersCount = Number(revenueResult[0]?.count || 0);
  
  const expensesResult = await db.select({
    total: sql<number>`SUM(${transactions.amount})`
  }).from(transactions).where(
    and(
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate),
      eq(transactions.type, "saida" as any)
    )
  );
  
  const totalExpenses = Number(expensesResult[0]?.total || 0);
  
  const commissionsResult = await db.select({
    total: sql<number>`SUM(${commissions.commissionAmount})`
  }).from(commissions).where(
    and(
      gte(commissions.createdAt, startDate),
      lte(commissions.createdAt, endDate)
    )
  );
  
  const totalCommissions = Number(commissionsResult[0]?.total || 0);
  const netProfit = totalRevenue - totalExpenses - totalCommissions;
  
  return {
    month, year, totalRevenue, totalExpenses,
    totalCommissions, netProfit, serviceOrdersCount,
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

export async function getRevenueByCategory(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const result = await db.select({
    name: serviceOrders.serviceType,
    value: sql<number>`SUM(${serviceOrders.totalCost})`
  })
  .from(serviceOrders)
  .where(
    and(
      gte(serviceOrders.completedDate, startDate),
      lte(serviceOrders.completedDate, endDate),
      inArray(serviceOrders.status, ["entregue", "pago"] as any[])
    )
  )
  .groupBy(serviceOrders.serviceType);

  const formatCategoryName = (key: string | null): string => {
    if (!key) return "Outros";
    const map: Record<string, string> = {
      "manutencao_industrial": "Manutenção Ind.",
      "fitness_refrigeracao": "Fitness/Refrig.",
      "automacao_industrial": "Automação Ind."
    };
    return map[key] || key;
  };

  return result.map(item => ({
    name: formatCategoryName(item.name),
    value: Number(item.value || 0)
  }));
}

// NOVA FUNÇÃO: Receita por Cliente (Top 5)
export async function getRevenueByCustomer(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const result = await db.select({
    name: customers.name,
    value: sql<number>`SUM(${serviceOrders.totalCost})`
  })
  .from(serviceOrders)
  .innerJoin(customers, eq(serviceOrders.customerId, customers.id))
  .where(
    and(
      gte(serviceOrders.completedDate, startDate),
      lte(serviceOrders.completedDate, endDate),
      inArray(serviceOrders.status, ["entregue", "pago"] as any[])
    )
  )
  .groupBy(customers.name)
  .orderBy(desc(sql`SUM(${serviceOrders.totalCost})`))
  .limit(5);

  return result.map(item => ({
    name: item.name,
    value: Number(item.value || 0)
  }));
}

// ... TransactionSummary (pode manter como estava)
export type TransactionSummary = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
};

export async function getTransactionSummary(
  startDate: Date,
  endDate: Date
): Promise<TransactionSummary> {
  const db = await getDb();
  if (!db) {
    return {
      totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0,
    };
  }
  
  const incomeResult = await db.select({
    total: sql<number>`SUM(${transactions.amount})`,
    count: sql<number>`COUNT(${transactions.id})`
  }).from(transactions).where(
    and(
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate),
      eq(transactions.type, "entrada" as any)
    )
  );
  
  const expensesResult = await db.select({
    total: sql<number>`SUM(${transactions.amount})`
  }).from(transactions).where(
    and(
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate),
      eq(transactions.type, "saida" as any)
    )
  );
  
  const totalIncome = Number(incomeResult[0]?.total || 0);
  const totalExpenses = Number(expensesResult[0]?.total || 0);
  const transactionCount = Number(incomeResult[0]?.count || 0);
  
  return {
    totalIncome, totalExpenses, balance: totalIncome - totalExpenses, transactionCount,
  };
}