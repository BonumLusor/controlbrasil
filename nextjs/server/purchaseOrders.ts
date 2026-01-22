import { getDb } from "./db";
import { purchaseOrders, purchaseOrderItems, components, products } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export async function getAllPurchaseOrders() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await db.select().from(purchaseOrders);
}

export async function getPurchaseOrderById(id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return po;
}

export async function getPurchaseOrderItems(purchaseOrderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const items = await db
    .select({
      id: purchaseOrderItems.id,
      purchaseOrderId: purchaseOrderItems.purchaseOrderId,
      componentId: purchaseOrderItems.componentId,
      componentName: components.name,
      productId: purchaseOrderItems.productId,
      productName: products.name,
      quantity: purchaseOrderItems.quantity,
      unitPrice: purchaseOrderItems.unitPrice,
      totalPrice: purchaseOrderItems.totalPrice,
      receivedQuantity: purchaseOrderItems.receivedQuantity
    })
    .from(purchaseOrderItems)
    .leftJoin(components, eq(purchaseOrderItems.componentId, components.id))
    .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
    .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

  return items.map(item => ({
    ...item,
    name: item.componentName || item.productName || "Item desconhecido",
    type: item.productId ? "Produto" : "Componente"
  }));
}

export async function createPurchaseOrder(data: any, items: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx: any) => {
    // Mantemos o cálculo do total para exibir na tabela
    const totalAmount = items.reduce((acc: number, item: any) => {
        return acc + (Number(item.quantity) * Number(item.unitPrice));
    }, 0);

    const [newOrder] = await tx.insert(purchaseOrders).values({
        ...data,
        totalAmount: totalAmount.toFixed(2)
    }).returning();

    for (const item of items) {
      await tx.insert(purchaseOrderItems).values({
        purchaseOrderId: newOrder.id,
        componentId: item.componentId || null,
        productId: item.productId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }
    return newOrder;
  });
}

export async function updatePurchaseOrder(id: number, data: any) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [updated] = await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id)).returning();
    return updated;
}

export async function approvePurchaseOrder(id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // REMOVIDO: Insert transaction. O report irá ler direto do status 'aguardando_entrega'
    const [updated] = await db.update(purchaseOrders).set({ status: 'aguardando_entrega' }).where(eq(purchaseOrders.id, id)).returning();
    return updated;
}

export async function deletePurchaseOrder(id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return await db.transaction(async (tx: any) => {
        // REMOVIDO: Delete transaction
        await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
        await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
        return { success: true };
    });
}

export async function fullyReceivePurchaseOrder(id: number, receivedById: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx: any) => {
    await tx.update(purchaseOrders)
      .set({ status: "recebido", receivedDate: new Date(), receivedById })
      .where(eq(purchaseOrders.id, id));

    const items = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));

    for (const item of items) {
      if (item.componentId) {
        await tx.update(components)
          .set({ quantity: sql`${components.quantity} + ${item.quantity}`, updatedAt: new Date() })
          .where(eq(components.id, item.componentId));
      } else if (item.productId) {
        await tx.update(products)
          .set({ quantity: sql`${products.quantity} + ${item.quantity}`, updatedAt: new Date() })
          .where(eq(products.id, item.productId!));
      }
      await tx.update(purchaseOrderItems).set({ receivedQuantity: item.quantity }).where(eq(purchaseOrderItems.id, item.id));
    }
    return { success: true };
  });
}