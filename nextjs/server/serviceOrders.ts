import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  serviceOrders,
  serviceOrderImages,
  components,
  serviceOrderComponents,
  serviceOrderEquipments, // Importe a tabela de equipamentos
  commissions,
  type ServiceOrder,
  type InsertServiceOrder,
  type InsertServiceOrderEquipment
} from "../drizzle/schema";

function getFileNameFromUrl(url: string): string {
  try {
    const parts = url.split('/');
    return parts[parts.length - 1];
  } catch (e) {
    return `image-${Date.now()}.jpg`;
  }
}

// Atualize o getAllServiceOrders para incluir os equipamentos
export async function getAllServiceOrders() {
  const db = await getDb();
  if (!db) return [];
  
  // 1. Busca todas as OS
  const orders = await db.select().from(serviceOrders).orderBy(desc(serviceOrders.createdAt));
  
  // 2. Busca todos os equipamentos vinculados (Otimização para evitar N+1 queries)
  const allEquipments = await db.select().from(serviceOrderEquipments);

  // 3. Agrupa equipamentos por ID da OS
  const equipmentsMap = allEquipments.reduce((acc, eq) => {
    if (!acc[eq.serviceOrderId]) {
      acc[eq.serviceOrderId] = [];
    }
    acc[eq.serviceOrderId].push(eq);
    return acc;
  }, {} as Record<number, typeof allEquipments>);
  
  // 4. Busca imagens para a lista (opcional, mas bom manter se já usava)
  // Se a lista ficar muito pesada, pode remover isso e carregar imagens só no detalhe
  const allImages = await db.select().from(serviceOrderImages);
  const imagesMap = allImages.reduce((acc, img) => {
    if (!acc[img.serviceOrderId]) acc[img.serviceOrderId] = [];
    acc[img.serviceOrderId].push(img.imageUrl);
    return acc;
  }, {} as Record<number, string[]>);

  // 5. Retorna as OS com seus equipamentos e imagens
  return orders.map(order => ({
    ...order,
    equipments: equipmentsMap[order.id] || [], // Garante que o array existe para o PDF
    images: imagesMap[order.id] || []
  }));
}

export async function getNextOrderNumber() {
  const db = await getDb();
  if (!db) return 1000;
  
  const result = await db.select({ orderNumber: serviceOrders.orderNumber })
    .from(serviceOrders)
    .orderBy(desc(serviceOrders.id))
    .limit(1);

  if (result.length === 0) return 1000;
  
  const lastNumber = parseInt(result[0].orderNumber.replace(/\D/g, ''));
  return isNaN(lastNumber) ? 1000 : lastNumber + 1;
}

export async function getServiceOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const order = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1);
  if (!order[0]) return undefined;
  
  const images = await db.select().from(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
  
  // Busca equipamentos vinculados
  const equipments = await db
    .select()
    .from(serviceOrderEquipments)
    .where(eq(serviceOrderEquipments.serviceOrderId, id));

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
    equipments: equipments, 
    components: usedComponents
  };
}

export async function getServiceOrdersByStatus(status: string) {
    const all = await getAllServiceOrders();
    return all.filter(o => o.status === status);
}

export async function getServiceOrdersByCustomer(customerId: number) {
    const all = await getAllServiceOrders();
    return all.filter(o => o.customerId === customerId);
}

// ... Funções create, update e delete (mantenha como atualizado anteriormente)

export async function createServiceOrder(
  data: InsertServiceOrder, 
  imageUrls: string[] = [],
  usedComponents: { componentId: number; quantity: number }[] = [],
  equipmentsList: Omit<InsertServiceOrderEquipment, 'serviceOrderId' | 'id'>[] = []
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx: any) => {
    const { ...orderData } = data;
    
    // Inserir a OS
    const result = await tx.insert(serviceOrders).values(orderData).returning({ id: serviceOrders.id });
    const insertedId = result[0]?.id;
    
    // Inserir Equipamentos
    if (equipmentsList && equipmentsList.length > 0) {
      await tx.insert(serviceOrderEquipments).values(
        equipmentsList.map(eq => ({
          ...eq,
          serviceOrderId: insertedId
        }))
      );
    }

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

    // Processar componentes
    if (usedComponents && usedComponents.length > 0) {
      for (const item of usedComponents) {
        await tx.insert(serviceOrderComponents).values({
          serviceOrderId: insertedId,
          componentId: item.componentId,
          quantity: item.quantity
        });
        
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
  usedComponents?: { componentId: number; quantity: number }[],
  equipmentsList?: Omit<InsertServiceOrderEquipment, 'serviceOrderId' | 'id'>[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx: any) => {
    // Atualiza dados básicos
    await tx.update(serviceOrders).set({ ...data, updatedAt: new Date() }).where(eq(serviceOrders.id, id));

    // Atualiza Equipamentos: Remove e reinsere para simplificar
    if (equipmentsList !== undefined) {
      await tx.delete(serviceOrderEquipments).where(eq(serviceOrderEquipments.serviceOrderId, id));
      
      if (equipmentsList.length > 0) {
        await tx.insert(serviceOrderEquipments).values(
          equipmentsList.map(eq => ({
            ...eq,
            serviceOrderId: id
          }))
        );
      }
    }

    // Atualiza imagens
    if (imageUrls !== undefined) {
      await tx.delete(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
      if (imageUrls.length > 0) {
        await tx.insert(serviceOrderImages).values(
          imageUrls.map(url => ({ serviceOrderId: id, imageUrl: url, fileName: getFileNameFromUrl(url) }))
        );
      }
    }

    // Atualiza componentes
    if (usedComponents !== undefined) {
      const currentItems = await tx.select().from(serviceOrderComponents).where(eq(serviceOrderComponents.serviceOrderId, id));
      for (const item of currentItems) {
        await tx.update(components)
          .set({ quantity: sql`${components.quantity} + ${item.quantity}` })
          .where(eq(components.id, item.componentId));
      }
      await tx.delete(serviceOrderComponents).where(eq(serviceOrderComponents.serviceOrderId, id));
      for (const item of usedComponents) {
        await tx.insert(serviceOrderComponents).values({
          serviceOrderId: id,
          componentId: item.componentId,
          quantity: item.quantity
        });
        await tx.update(components)
          .set({ quantity: sql`${components.quantity} - ${item.quantity}` })
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
    await tx.delete(serviceOrderComponents).where(eq(serviceOrderComponents.serviceOrderId, id));
    await tx.delete(serviceOrderEquipments).where(eq(serviceOrderEquipments.serviceOrderId, id));
    await tx.delete(commissions).where(eq(commissions.serviceOrderId, id));
    await tx.delete(serviceOrderImages).where(eq(serviceOrderImages.serviceOrderId, id));
    await tx.delete(serviceOrders).where(eq(serviceOrders.id, id));
  });
}