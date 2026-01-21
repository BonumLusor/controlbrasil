import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  commissions,
  serviceOrders,
  employees,
  type Commission,
  type InsertCommission,
} from "../drizzle/schema";

export async function calculateCommission(
  employeeId: number,
  serviceOrderId: number,
  amount: string
): Promise<Commission> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get employee commission rate
  const employee = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee.length) throw new Error("Employee not found");
  
  const commissionRate = parseFloat(employee[0].commissionRate || "0");
  const orderAmount = parseFloat(amount);
  const commissionAmount = (orderAmount * commissionRate / 100).toFixed(2);
  
  // Create commission record
  // CORREÇÃO: Adicionado .returning()
  const result = await db.insert(commissions).values({
    employeeId,
    serviceOrderId,
    commissionAmount,
    commissionRate: commissionRate.toFixed(2),
    basedOnAmount: amount,
    paid: false,
  }).returning({ id: commissions.id });
  
  const insertedId = result[0]?.id;

  if (!insertedId) throw new Error("Failed to insert commission");

  const commission = await db.select().from(commissions).where(eq(commissions.id, insertedId)).limit(1);
  
  if (!commission.length) throw new Error("Failed to create commission");
  return commission[0];
}

export async function getCommissionsByEmployee(employeeId: number): Promise<Commission[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(commissions).where(eq(commissions.employeeId, employeeId));
}

export async function getCommissionsByDateRange(
  employeeId: number,
  startDate: Date,
  endDate: Date
): Promise<Commission[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(commissions).where(
    and(
      eq(commissions.employeeId, employeeId),
      gte(commissions.createdAt, startDate),
      lte(commissions.createdAt, endDate)
    )
  );
}

export async function getPendingCommissions(employeeId?: number): Promise<Commission[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (employeeId) {
    return await db.select().from(commissions).where(
      and(
        eq(commissions.employeeId, employeeId),
        eq(commissions.paid, false)
      )
    );
  }
  
  return await db.select().from(commissions).where(eq(commissions.paid, false));
}

export async function payCommission(id: number): Promise<Commission> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(commissions).set({
    paid: true,
    paidDate: new Date(),
  }).where(eq(commissions.id, id));
  
  const commission = await db.select().from(commissions).where(eq(commissions.id, id)).limit(1);
  if (!commission.length) throw new Error("Commission not found");
  
  return commission[0];
}

export async function getTotalCommissionsByEmployee(
  employeeId: number,
  year: number,
  month: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const result = await db.select({
    total: sql<number>`SUM(${commissions.commissionAmount})`
  }).from(commissions).where(
    and(
      eq(commissions.employeeId, employeeId),
      gte(commissions.createdAt, startDate),
      lte(commissions.createdAt, endDate)
    )
  );
  
  return result[0]?.total || 0;
}
