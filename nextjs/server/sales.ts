import { getDb } from "./db";
import { sales, saleItems, products, customers } from "../drizzle/schema"; // Removido 'transactions'
import { eq, desc, sql } from "drizzle-orm";

export async function getAllSales() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      id: sales.id,
      customerId: sales.customerId,
      customerName: customers.name,
      totalAmount: sales.totalAmount,
      status: sales.status,
      saleDate: sales.saleDate,
      paymentMethod: sales.paymentMethod,
    })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .orderBy(desc(sales.saleDate));
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [sale] = await db.select().from(sales).where(eq(sales.id, id));
  if (!sale) return null;

  const items = await db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      productName: products.name,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      totalPrice: saleItems.totalPrice,
    })
    .from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, id));

  return { ...sale, items };
}

type CreateSaleInput = {
  customerId: number;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
  items: {
    productId: number;
    quantity: number;
  }[];
};

export async function createSaleTransaction(input: CreateSaleInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx: any) => {
    // 1. Criar a Venda
    const [newSale] = await tx
      .insert(sales)
      .values({
        customerId: input.customerId,
        totalAmount: input.totalAmount.toString(),
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        status: "concluido",
      })
      .returning();

    // 2. Processar Itens e Atualizar Estoque
    for (const item of input.items) {
      const [prod] = await tx.select().from(products).where(eq(products.id, item.productId));
      
      if (!prod) throw new Error(`Produto ID ${item.productId} não encontrado.`);
      if (prod.quantity < item.quantity) throw new Error(`Estoque insuficiente para o produto: ${prod.name}`);

      const unitPrice = Number(prod.price);
      const totalPrice = unitPrice * item.quantity;

      // Inserir Item da Venda
      await tx.insert(saleItems).values({
        saleId: newSale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toString(),
      });

      // Baixar Estoque
      await tx
        .update(products)
        .set({ 
          quantity: sql`${products.quantity} - ${item.quantity}`,
          updatedAt: new Date()
        })
        .where(eq(products.id, item.productId));
    }

    // REMOVIDO: 3. Criar Transação Financeira (Entrada)
    // A receita agora é calculada dinamicamente pelo reports.ts lendo a tabela 'sales'

    return newSale;
  });
}