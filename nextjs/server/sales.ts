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
      // ATUALIZADO AQUI:
      customerName: sql<string>`
        CASE 
          WHEN ${customers.company} IS NOT NULL AND ${customers.company} <> '' 
          THEN ${customers.company} || ' - ' || ${customers.manager} 
          ELSE ${customers.manager} 
        END`.as('customer_display_name'),
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

// Certifique-se de que os imports no topo incluam 'sql'
// import { eq, desc, sql } from "drizzle-orm";

export async function cancelSale(saleId: number, reason: "cancelado" | "devolvido" = "cancelado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx: any) => {
    // 1. Verificar se a venda existe e já não está cancelada
    const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
    
    if (!sale) throw new Error("Venda não encontrada.");
    if (["cancelado", "devolvido"].includes(sale.status || "")) {
      throw new Error("Esta venda já foi cancelada ou devolvida.");
    }

    // 2. Buscar os itens da venda para devolver ao estoque
    const itemsToReturn = await tx
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

    // 3. Devolver estoque (Loop pelos itens)
    for (const item of itemsToReturn) {
      await tx.update(products)
        .set({ 
          quantity: sql`${products.quantity} + ${item.quantity}`, // SOMA de volta ao estoque
          updatedAt: new Date()
        })
        .where(eq(products.id, item.productId));
    }

    // 4. Atualizar status da venda
    // Opcional: Você pode querer salvar o motivo ou data de cancelamento nas notas
    const updatedNotes = sale.notes 
      ? `${sale.notes} | ${reason.toUpperCase()} em ${new Date().toLocaleDateString()}`
      : `${reason.toUpperCase()} em ${new Date().toLocaleDateString()}`;

    await tx.update(sales)
      .set({ 
        status: reason,
        notes: updatedNotes,
        // Opcional: Se quiser zerar o valor visualmente no banco, descomente a linha abaixo. 
        // Mas o filtro no reports.ts já resolve o problema financeiro sem perder o histórico do valor original.
        // totalAmount: "0.00" 
      })
      .where(eq(sales.id, saleId));

    return { success: true, message: `Venda marcada como ${reason} e estoque restaurado.` };
  });
}

export async function updateSaleStatus(saleId: number, newStatus: "concluido" | "cancelado" | "devolvido") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return await db.transaction(async (tx: any) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
    if (!sale) throw new Error("Venda não encontrada");

    const currentStatus = sale.status || "concluido";
    if (currentStatus === newStatus) return { message: "Status já é o atual." };

    // Buscar itens da venda
    const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));

    // LÓGICA DE ESTOQUE
    // 1. Se estava CONCLUIDO e vai para DEVOLVIDO/CANCELADO -> Restaurar Estoque (+)
    if (currentStatus === "concluido" && newStatus !== "concluido") {
      for (const item of items) {
        await tx.update(products)
          .set({ quantity: sql`${products.quantity} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
    }
    // 2. Se estava DEVOLVIDO/CANCELADO e vai para CONCLUIDO -> Baixar Estoque (-)
    else if (currentStatus !== "concluido" && newStatus === "concluido") {
      for (const item of items) {
        // Verifica estoque antes de baixar
        const [prod] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!prod || prod.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para reaprovar o produto: ${prod?.name}`);
        }

        await tx.update(products)
          .set({ quantity: sql`${products.quantity} - ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
    }
    // 3. Se for troca entre DEVOLVIDO <-> CANCELADO -> Não muda estoque

    // Atualiza status
    await tx.update(sales)
      .set({ 
        status: newStatus, 
        updatedAt: new Date(),
        notes: sale.notes ? `${sale.notes} | Status alterado para ${newStatus}` : `Status alterado para ${newStatus}`
      })
      .where(eq(sales.id, saleId));

    return { success: true };
  });
}

export async function deleteSale(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return await db.transaction(async (tx: any) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
    if (!sale) throw new Error("Venda não encontrada");

    // Se a venda ainda está CONCLUÍDA, precisamos devolver o estoque antes de apagar
    if (sale.status === "concluido") {
      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
      for (const item of items) {
        await tx.update(products)
          .set({ quantity: sql`${products.quantity} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
    }

    // Apagar itens e a venda
    await tx.delete(saleItems).where(eq(saleItems.saleId, saleId));
    await tx.delete(sales).where(eq(sales.id, saleId));

    return { success: true };
  });
}