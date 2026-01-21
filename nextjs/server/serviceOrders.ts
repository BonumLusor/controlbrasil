import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  serviceOrders,
  serviceOrderImages,
  type ServiceOrder,
  type InsertServiceOrder,
} from "../drizzle/schema";

// Helper para extrair nome do arquivo da URL
function getFileNameFromUrl(url: string): string {
  if (!url) return "unknown";
  return url.split('/').pop() || "unknown";
}

export async function getAllServiceOrders(): Promise<ServiceOrder[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(serviceOrders).orderBy(desc(serviceOrders.createdAt));
}

export async function getServiceOrderById(id: number): Promise<(ServiceOrder & { images: string[] }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const order = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
  
  if (!order[0]) return undefined;

  // Busca as imagens relacionadas
  const images = await db
    .select()
    .from(serviceOrderImages)
    .where(eq(serviceOrderImages.serviceOrderId, id));

  return {
    ...order[0],
    images: images.map(img => img.imageUrl)
  };
}

export async function getNextOrderNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return "600";

  const orders = await db
    .select({ orderNumber: serviceOrders.orderNumber })
    .from(serviceOrders);

  let maxNumber = 599;

  for (const order of orders) {
    const numStr = order.orderNumber.replace(/\D/g, "");
    const num = parseInt(numStr, 10);

    if (!isNaN(num)) {
      if (num < 1000000 && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return (maxNumber + 1).toString();
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

export async function createServiceOrder(
  data: InsertServiceOrder, 
  imageUrls: string[] = []
): Promise<ServiceOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(serviceOrders).values(data).returning({ id: serviceOrders.id });
  const insertedId = result[0]?.id;
  
  if (!insertedId) throw new Error("Failed to insert service order");

  // Inserir imagens se houver
  if (imageUrls && imageUrls.length > 0) {
    await db.insert(serviceOrderImages).values(
      imageUrls.map(url => ({
        serviceOrderId: insertedId,
        imageUrl: url,
        fileName: getFileNameFromUrl(url) // Salva o nome explicitamente
      }))
    );
  }

  const order = await getServiceOrderById(insertedId);
  if (!order) throw new Error("Failed to create service order");
  
  return order;
}

export async function updateServiceOrder(
  id: number, 
  data: Partial<InsertServiceOrder>,
  imageUrls?: string[]
): Promise<ServiceOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (data.status && ["entregue", "pago"].includes(data.status)) {
    if (!data.completedDate) {
      data.completedDate = new Date();
    }
  }
  
  if (data.status === "entregue" && !data.deliveredDate) {
    data.deliveredDate = new Date();
  }
  
  await db.update(serviceOrders).set(data).where(eq(serviceOrders.id, id));

  // Se uma nova lista de imagens foi fornecida
  if (imageUrls !== undefined) {
    // Remove todas as imagens atuais
    await db.delete(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
    
    // Insere as novas
    if (imageUrls.length > 0) {
      await db.insert(serviceOrderImages).values(
        imageUrls.map(url => ({
          serviceOrderId: id,
          imageUrl: url,
          fileName: getFileNameFromUrl(url)
        }))
      );
    }
  }
  
  const order = await getServiceOrderById(id);
  if (!order) throw new Error("Service order not found");
  
  return order;
}

export async function deleteServiceOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Imagens são deletadas por cascade se configurado no DB, 
  // mas por segurança deletamos manualmente antes
  await db.delete(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
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