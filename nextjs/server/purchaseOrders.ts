import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  purchaseOrders,
  purchaseOrderItems,
  transactions,
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
  
  const totalAmount = items.reduce((sum, item) => {
    const price = parseFloat(item.totalPrice as string);
    return sum + price;
  }, 0);
  
  const result = await db.insert(purchaseOrders).values({
    ...orderData,
    totalAmount: totalAmount.toFixed(2),
    status: "pendente", // Sempre começa pendente (aguardando aprovação)
  }).returning({ id: purchaseOrders.id });
  
  const purchaseOrderId = result[0]?.id;

  if (!purchaseOrderId) throw new Error("Failed to insert purchase order");
  
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

// FLUXO 1: APROVAR PEDIDO (Gera Despesa + Muda Status)
export async function approvePurchaseOrder(id: number): Promise<PurchaseOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Pedido não encontrado");

  // Cria a transação de despesa
  await db.insert(transactions).values({
    type: "saida",
    category: "Compra de Componentes", // Categoria fixa ou dinâmica
    description: `Pedido de Compra #${order.orderNumber} - ${order.supplier}`,
    amount: order.totalAmount || "0.00",
    transactionDate: new Date(),
    purchaseOrderId: id,
    paymentMethod: "Outros",
  });

  // Atualiza status para Aguardando Entrega
  await db.update(purchaseOrders).set({
    status: "aguardando_entrega"
  }).where(eq(purchaseOrders.id, id));

  return order;
}

// FLUXO 2: RECEBER PEDIDO (Atualiza Estoque + Muda Status)
export async function fullyReceivePurchaseOrder(id: number, receivedById: number): Promise<PurchaseOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const items = await getPurchaseOrderItems(id);
  
  // Atualiza estoque de todos os itens
  for (const item of items) {
    const remaining = item.quantity - (item.receivedQuantity || 0);
    if (remaining > 0) {
      // Marca item como recebido
      await db.update(purchaseOrderItems).set({
        receivedQuantity: item.quantity
      }).where(eq(purchaseOrderItems.id, item.id));

      // SOMA AO ESTOQUE
      await updateComponentQuantity(item.componentId, remaining);
    }
  }

  // Atualiza pedido para Recebido
  await db.update(purchaseOrders).set({
    status: "recebido",
    receivedById,
    receivedDate: new Date()
  }).where(eq(purchaseOrders.id, id));

  const order = await getPurchaseOrderById(id);
  if (!order) throw new Error("Purchase order not found");
  return order;
}

// Função auxiliar legado (mantida para compatibilidade se necessário)
export async function receivePurchaseOrder(
  id: number,
  receivedById: number,
  itemsReceived: { itemId: number; quantityReceived: number }[]
): Promise<PurchaseOrder> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const item of itemsReceived) {
    const orderItem = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, item.itemId)).limit(1);
    
    if (orderItem.length > 0) {
      const currentItem = orderItem[0];
      const newReceivedQty = (currentItem.receivedQuantity || 0) + item.quantityReceived;
      
      await db.update(purchaseOrderItems).set({
        receivedQuantity: newReceivedQty,
      }).where(eq(purchaseOrderItems.id, item.itemId));
      
      await updateComponentQuantity(currentItem.componentId, item.quantityReceived);
    }
  }
  
  const allItems = await getPurchaseOrderItems(id);
  const allReceived = allItems.every(item => item.receivedQuantity >= item.quantity);
  const newStatus = allReceived ? "recebido" : "recebido_parcial";
  
  await db.update(purchaseOrders).set({
    status: newStatus as any,
    receivedById,
    receivedDate: newStatus === "recebido" ? new Date() : undefined,
  }).where(eq(purchaseOrders.id, id));
  
  return (await getPurchaseOrderById(id))!;
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Remove itens e transações vinculadas (opcional: manter transação?)
  // Por segurança, se deletar o pedido, deletamos os itens. 
  // A transação financeira, idealmente, deveria ser estornada ou mantida com aviso, 
  // mas aqui vamos focar na limpeza básica.
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
}