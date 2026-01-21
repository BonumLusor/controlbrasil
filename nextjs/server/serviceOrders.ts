import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  serviceOrders,
  type ServiceOrder,
  type InsertServiceOrder,
} from "../drizzle/schema";

export async function getAllServiceOrders(): Promise<ServiceOrder[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serviceOrders).orderBy(desc(serviceOrders.createdAt));
}

export async function getServiceOrderById(id: number): Promise<ServiceOrder | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
  return result[0];
}

export async function getServiceOrdersByStatus(status: string): Promise<ServiceOrder[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serviceOrders).where(eq(serviceOrders.status, status as any)).orderBy(desc(serviceOrders.createdAt));
}

export async function getServiceOrdersByCustomer(customerId: number): Promise<ServiceOrder[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serviceOrders).where(eq(serviceOrders.customerId, customerId)).orderBy(desc(serviceOrders.createdAt));
}

export async function getServiceOrdersByTechnician(technicianId: number): Promise<ServiceOrder[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serviceOrders).where(eq(serviceOrders.technicianId, technicianId)).orderBy(desc(serviceOrders.createdAt));
}

export async function getServiceOrdersByDateRange(startDate: Date, endDate: Date): Promise<ServiceOrder[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serviceOrders).where(
    and(
      gte(serviceOrders.receivedDate, startDate),
      lte(serviceOrders.receivedDate, endDate)
    )
  ).orderBy(desc(serviceOrders.receivedDate));
}

export async function createServiceOrder(data: InsertServiceOrder): Promise<ServiceOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // CORREÇÃO: Adicionado .returning()
  const result = await db.insert(serviceOrders).values(data).returning({ id: serviceOrders.id });
  const insertedId = result[0]?.id;
  
  if (!insertedId) throw new Error("Failed to insert service order");

  const order = await getServiceOrderById(insertedId);
  if (!order) throw new Error("Failed to create service order");
  
  return order;
}

export async function updateServiceOrder(id: number, data: Partial<InsertServiceOrder>): Promise<ServiceOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Auto-update completedDate when status changes to completed states
  if (data.status && ["entregue", "pago"].includes(data.status)) {
    if (!data.completedDate) {
      data.completedDate = new Date();
    }
  }
  
  // Auto-update deliveredDate when status is entregue
  if (data.status === "entregue" && !data.deliveredDate) {
    data.deliveredDate = new Date();
  }
  
  await db.update(serviceOrders).set(data).where(eq(serviceOrders.id, id));
  
  const order = await getServiceOrderById(id);
  if (!order) throw new Error("Service order not found");
  
  return order;
}

export async function deleteServiceOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(serviceOrders).where(eq(serviceOrders.id, id));
}

export async function getMonthlyRevenue(year: number, month: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const result = await db.select({
    total: sql<number>`SUM(${serviceOrders.totalCost})`
  }).from(serviceOrders).where(
    and(
      gte(serviceOrders.receivedDate, startDate),
      lte(serviceOrders.receivedDate, endDate),
      eq(serviceOrders.status, "pago" as any)
    )
  );
  
  return result[0]?.total || 0;
}
