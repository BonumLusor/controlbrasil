import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  serviceOrders,
  serviceOrderImages,
  components,            // Importado
  serviceOrderComponents, // Importado
  commissions,
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

export async function getServiceOrderById(id: number): Promise<(ServiceOrder & { images: string[], components: any[] }) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const order = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
  if (!order[0]) return undefined;
  
  const images = await db.select().from(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
  
  // Buscar componentes vinculados e seus nomes
  const usedComponents = await db
    .select({
      componentId: serviceOrderComponents.componentId,
      quantity: serviceOrderComponents.quantity,
      name: components.name,
      unitPrice: components.unitPrice
    })
    .from(serviceOrderComponents)
    .leftJoin(components, eq(serviceOrderComponents.componentId, components.id))
    .where(eq(serviceOrderComponents.serviceOrderId, id));

  return { 
    ...order[0], 
    images: images.map(img => img.imageUrl),
    components: usedComponents
  };
}

export async function getNextOrderNumber() {
  const db = await getDb();
  if (!db) return 601; // Fallback se não houver DB

  // Busca todos os números de OS
  const orders = await db
    .select({ orderNumber: serviceOrders.orderNumber })
    .from(serviceOrders);

  let maxNumber = 600; // Número base inicial (se não houver nada, a próxima será 601)

  for (const order of orders) {
    // Remove "OS" (maiúsculo ou minúsculo) e pega o número
    const numStr = order.orderNumber.replace(/^OS/i, '');
    const num = parseInt(numStr, 10);

    // Se for um número válido e maior que o atual máximo, atualiza
    // Também ignoramos números muito grandes que pareçam datas (ex: 20260002) para corrigir o erro
    if (!isNaN(num) && num > maxNumber && num < 1000000) {
      maxNumber = num;
    }
  }

  return maxNumber + 1; // Retorna apenas o número (ex: 601)
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

type UsedComponent = { componentId: number; quantity: number };

export async function createServiceOrder(
  data: InsertServiceOrder, 
  imageUrls: string[] = [],
  usedComponents: UsedComponent[] = [] // Novo parâmetro
): Promise<ServiceOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx: any) => {
    // Inserir a OS
    const result = await tx.insert(serviceOrders).values(data).returning({ id: serviceOrders.id });
    const insertedId = result[0]?.id;
    
    // Inserir imagens
    if (imageUrls && imageUrls.length > 0) {
      await tx.insert(serviceOrderImages).values(
        imageUrls.map(url => ({
          serviceOrderId: insertedId,
          imageUrl: url,
          fileName: getFileNameFromUrl(url)
        }))
      );
    }

    // Processar componentes e baixar estoque
    if (usedComponents && usedComponents.length > 0) {
      for (const item of usedComponents) {
        // Registra o uso
        await tx.insert(serviceOrderComponents).values({
          serviceOrderId: insertedId,
          componentId: item.componentId,
          quantity: item.quantity
        });
        
        // Remove do estoque (components.quantity - item.quantity)
        await tx.update(components)
          .set({ quantity: sql`${components.quantity} - ${item.quantity}` })
          .where(eq(components.id, item.componentId));
      }
    }

    const [order] = await tx.select().from(serviceOrders).where(eq(serviceOrders.id, insertedId));
    return order;
  });
}

export async function updateServiceOrder(
  id: number, 
  data: Partial<InsertServiceOrder>, 
  imageUrls?: string[],
  usedComponents?: UsedComponent[] // Novo parâmetro
): Promise<ServiceOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // ... (lógica existente de datas status/entregue)
  if (data.status && ["entregue", "pago"].includes(data.status)) {
    if (!data.completedDate) data.completedDate = new Date();
  }
  if (data.status === "entregue" && !data.deliveredDate) {
    data.deliveredDate = new Date();
  }
  
  return await db.transaction(async (tx: any) => {
    // Atualiza dados básicos
    await tx.update(serviceOrders).set({ ...data, updatedAt: new Date() }).where(eq(serviceOrders.id, id));

    // Atualiza imagens se fornecidas
    if (imageUrls !== undefined) {
      await tx.delete(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
      if (imageUrls.length > 0) {
        await tx.insert(serviceOrderImages).values(
          imageUrls.map(url => ({ serviceOrderId: id, imageUrl: url, fileName: getFileNameFromUrl(url) }))
        );
      }
    }

    // Atualiza componentes e estoque
    if (usedComponents !== undefined) {
      // 1. Reverter o estoque dos componentes que já estavam na OS
      const currentItems = await tx.select().from(serviceOrderComponents).where(eq(serviceOrderComponents.serviceOrderId, id));
      for (const item of currentItems) {
        await tx.update(components)
          .set({ quantity: sql`${components.quantity} + ${item.quantity}` }) // Devolve ao estoque
          .where(eq(components.id, item.componentId));
      }

      // 2. Limpar vínculos antigos
      await tx.delete(serviceOrderComponents).where(eq(serviceOrderComponents.serviceOrderId, id));

      // 3. Aplicar novos componentes e baixar estoque novamente
      for (const item of usedComponents) {
        await tx.insert(serviceOrderComponents).values({
          serviceOrderId: id,
          componentId: item.componentId,
          quantity: item.quantity
        });

        await tx.update(components)
          .set({ quantity: sql`${components.quantity} - ${item.quantity}` }) // Baixa do estoque
          .where(eq(components.id, item.componentId));
      }
    }

    const [updatedOrder] = await tx.select().from(serviceOrders).where(eq(serviceOrders.id, id));
    return updatedOrder;
  });
}

export async function deleteServiceOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.transaction(async (tx: any) => {
    // 1. (OPCIONAL) Restaurar o estoque dos componentes antes de excluir?
    // Se você quiser que o estoque volte ao normal ao deletar a OS, descomente abaixo:
    /*
    const itemsToRestore = await tx.select()
      .from(serviceOrderComponents)
      .where(eq(serviceOrderComponents.serviceOrderId, id));
      
    for (const item of itemsToRestore) {
      await tx.update(components)
        .set({ quantity: sql`${components.quantity} + ${item.quantity}` })
        .where(eq(components.id, item.componentId));
    }
    */

    // 2. Excluir os componentes vinculados à OS (CORREÇÃO DO ERRO)
    // Isso é obrigatório porque existe uma chave estrangeira
    await tx.delete(serviceOrderComponents).where(eq(serviceOrderComponents.serviceOrderId, id));

    // 3. Excluir comissões vinculadas (Boa prática para não deixar lixo)
    // No seu schema, commissions não tem chave estrangeira forçada, mas é bom limpar
    await tx.delete(commissions).where(eq(commissions.serviceOrderId, id));

    // 4. Excluir as imagens
    await tx.delete(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));

    // 5. Finalmente, excluir a Ordem de Serviço
    await tx.delete(serviceOrders).where(eq(serviceOrders.id, id));
  });
}

export async function getMonthlyRevenue(year: number, month: number): Promise<number> {
    const report = await import('./reports').then(r => r.getMonthlyReport(year, month));
    return report.totalRevenue;
}