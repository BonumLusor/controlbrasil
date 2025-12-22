import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  purchaseOrders,
  purchaseOrderItems,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
} from "../drizzle/schema";
import { updateComponentQuantity } from "./components";

export async function getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrderById(id: number): Promise<PurchaseOrder | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
  return result[0];
}

export async function getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
}

export async function createPurchaseOrder(
  orderData: InsertPurchaseOrder,
  items: Omit<InsertPurchaseOrderItem, "purchaseOrderId">[]
): Promise<PurchaseOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => {
    const price = parseFloat(item.totalPrice as string);
    return sum + price;
  }, 0);
  
  // Create purchase order
  const result = await db.insert(purchaseOrders).values({
    ...orderData,
    totalAmount: totalAmount.toFixed(2),
  });
  
  const purchaseOrderId = Number(result[0].insertId);
  
  // Create purchase order items
  for (const item of items) {
    await db.insert(purchaseOrderItems).values({
      ...item,
      purchaseOrderId,
    });
  }
  
  const order = await getPurchaseOrderById(purchaseOrderId);
  if (!order) throw new Error("Failed to create purchase order");
  
  return order;
}

export async function updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id));
  
  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Purchase order not found");
  
  return order;
}

export async function receivePurchaseOrder(
  id: number,
  receivedById: number,
  itemsReceived: { itemId: number; quantityReceived: number }[]
): Promise<PurchaseOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update each item's received quantity and update component stock
  for (const item of itemsReceived) {
    const orderItem = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, item.itemId)).limit(1);
    
    if (orderItem.length > 0) {
      const currentItem = orderItem[0];
      const newReceivedQty = (currentItem.receivedQuantity || 0) + item.quantityReceived;
      
      // Update purchase order item
      await db.update(purchaseOrderItems).set({
        receivedQuantity: newReceivedQty,
      }).where(eq(purchaseOrderItems.id, item.itemId));
      
      // Update component stock
      await updateComponentQuantity(currentItem.componentId, item.quantityReceived);
    }
  }
  
  // Check if all items are fully received
  const allItems = await getPurchaseOrderItems(id);
  const allReceived = allItems.every(item => item.receivedQuantity >= item.quantity);
  const partiallyReceived = allItems.some(item => (item.receivedQuantity || 0) > 0);
  
  const newStatus = allReceived ? "recebido" : partiallyReceived ? "recebido_parcial" : "pendente";
  
  // Update purchase order
  await db.update(purchaseOrders).set({
    status: newStatus as any,
    receivedById,
    receivedDate: newStatus === "recebido" ? new Date() : undefined,
  }).where(eq(purchaseOrders.id, id));
  
  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Purchase order not found");
  
  return order;
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete items first
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  
  // Delete order
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
}
