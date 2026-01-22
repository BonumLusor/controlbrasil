import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  serviceOrders,
  serviceOrderImages,
  // transactions, <- REMOVIDO
  type ServiceOrder,
  type InsertServiceOrder,
} from "../drizzle/schema";

function getFileNameFromUrl(url: string): string {
  if (!url) return "unknown";
  return url.split('/').pop() || "unknown";
}

async function attachImagesToOrders(orders: ServiceOrder[]) {
  const db = await getDb();
  if (!db || orders.length === 0) return orders.map(o => ({ ...o, images: [] as string[] }));

  const orderIds = orders.map(o => o.id);
  const images = await db
    .select()
    .from(serviceOrderImages)
    .where(inArray(serviceOrderImages.serviceOrderId, orderIds));

  const imgMap = new Map<number, string[]>();
  images.forEach(img => {
    if (!imgMap.has(img.serviceOrderId)) imgMap.set(img.serviceOrderId, []);
    imgMap.get(img.serviceOrderId)?.push(img.imageUrl);
  });

  return orders.map(order => ({ ...order, images: imgMap.get(order.id) || [] }));
}

export async function getAllServiceOrders(): Promise<(ServiceOrder & { images: string[] })[]> {
  const db = await getDb();
  if (!db) return [];
  const orders = await db.select().from(serviceOrders).orderBy(desc(serviceOrders.createdAt));
  return await attachImagesToOrders(orders);
}

export async function getServiceOrderById(id: number): Promise<(ServiceOrder & { images: string[] }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const order = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
  if (!order[0]) return undefined;
  const images = await db.select().from(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
  return { ...order[0], images: images.map(img => img.imageUrl) };
}

export async function getNextOrderNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return "600";
  const [lastOrder] = await db.select().from(serviceOrders).orderBy(desc(serviceOrders.id)).limit(1);
  const lastId = lastOrder ? lastOrder.id : 599; 
  return `OS${new Date().getFullYear()}${(lastId + 1).toString().padStart(4, '0')}`;
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
    and(gte(serviceOrders.receivedDate, startDate), lte(serviceOrders.receivedDate, endDate))
  ).orderBy(desc(serviceOrders.receivedDate));
}

export async function createServiceOrder(data: InsertServiceOrder, imageUrls: string[] = []): Promise<ServiceOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx: any) => {
    const result = await tx.insert(serviceOrders).values(data).returning({ id: serviceOrders.id });
    const insertedId = result[0]?.id;
    
    if (imageUrls && imageUrls.length > 0) {
      await tx.insert(serviceOrderImages).values(
        imageUrls.map(url => ({
          serviceOrderId: insertedId,
          imageUrl: url,
          fileName: getFileNameFromUrl(url)
        }))
      );
    }
    // REMOVIDO: Insert transactions
    const [order] = await tx.select().from(serviceOrders).where(eq(serviceOrders.id, insertedId));
    return order;
  });
}

export async function updateServiceOrder(id: number, data: Partial<InsertServiceOrder>, imageUrls?: string[]): Promise<ServiceOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (data.status && ["entregue", "pago"].includes(data.status)) {
    if (!data.completedDate) data.completedDate = new Date();
  }
  if (data.status === "entregue" && !data.deliveredDate) {
    data.deliveredDate = new Date();
  }
  
  return await db.transaction(async (tx: any) => {
    await tx.update(serviceOrders).set({ ...data, updatedAt: new Date() }).where(eq(serviceOrders.id, id));

    if (imageUrls !== undefined) {
      await tx.delete(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
      if (imageUrls.length > 0) {
        await tx.insert(serviceOrderImages).values(
          imageUrls.map(url => ({ serviceOrderId: id, imageUrl: url, fileName: getFileNameFromUrl(url) }))
        );
      }
    }
    // REMOVIDO: Update transactions logic
    const [updatedOrder] = await tx.select().from(serviceOrders).where(eq(serviceOrders.id, id));
    return updatedOrder;
  });
}

export async function deleteServiceOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.transaction(async (tx: any) => {
    // REMOVIDO: Delete transactions
    await tx.delete(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
    await tx.delete(serviceOrders).where(eq(serviceOrders.id, id));
  });
}

export async function getMonthlyRevenue(year: number, month: number): Promise<number> {
    const report = await import('./reports').then(r => r.getMonthlyReport(year, month));
    return report.totalRevenue;
}