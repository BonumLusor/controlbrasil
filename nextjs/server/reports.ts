import { and, gte, lte, sql, eq } from "drizzle-orm";
import { getDb } from "./db";
import { serviceOrders, transactions, commissions } from "../drizzle/schema";

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
      month,
      year,
      totalRevenue: 0,
      totalExpenses: 0,
      totalCommissions: 0,
      netProfit: 0,
      serviceOrdersCount: 0,
    };
  }
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  // Get revenue from paid service orders
  const revenueResult = await db.select({
    total: sql<number>`SUM(${serviceOrders.totalCost})`,
    count: sql<number>`COUNT(${serviceOrders.id})`
  }).from(serviceOrders).where(
    and(
      gte(serviceOrders.receivedDate, startDate),
      lte(serviceOrders.receivedDate, endDate),
      eq(serviceOrders.status, "pago" as any)
    )
  );
  
  const totalRevenue = revenueResult[0]?.total || 0;
  const serviceOrdersCount = revenueResult[0]?.count || 0;
  
  // Get expenses from transactions
  const expensesResult = await db.select({
    total: sql<number>`SUM(${transactions.amount})`
  }).from(transactions).where(
    and(
      gte(transactions.transactionDate, startDate),
      lte(transactions.transactionDate, endDate),
      eq(transactions.type, "saida" as any)
    )
  );
  
  const totalExpenses = expensesResult[0]?.total || 0;
  
  // Get total commissions
  const commissionsResult = await db.select({
    total: sql<number>`SUM(${commissions.commissionAmount})`
  }).from(commissions).where(
    and(
      gte(commissions.createdAt, startDate),
      lte(commissions.createdAt, endDate)
    )
  );
  
  const totalCommissions = commissionsResult[0]?.total || 0;
  
  const netProfit = totalRevenue - totalExpenses - totalCommissions;
  
  return {
    month,
    year,
    totalRevenue,
    totalExpenses,
    totalCommissions,
    netProfit,
    serviceOrdersCount,
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
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: 0,
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
  
  const totalIncome = incomeResult[0]?.total || 0;
  const totalExpenses = expensesResult[0]?.total || 0;
  const transactionCount = incomeResult[0]?.count || 0;
  
  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    transactionCount,
  };
}
