// nextjs/server/products.ts
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { products, type Product, type InsertProduct } from "../drizzle/schema";

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  
  // ALTERADO: Adicionado filtro .where(eq(products.active, true))
  return await db
    .select()
    .from(products)
    .where(eq(products.active, true)) 
    .orderBy(desc(products.createdAt));
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
    
  return result[0];
}

export async function createProduct(data: InsertProduct): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(products).values(data).returning();
  return result[0];
}

export async function updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
    
  return result[0];
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ALTERADO: Ao invés de delete(), usamos update() para active: false
  await db
    .update(products)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(products.id, id));
}

// Se você tiver a função getLowStockProducts, lembre de filtrar os ativos também:
export async function getLowStockProducts() {
    const db = await getDb();
    if (!db) return [];
    // Exemplo de lógica (ajuste conforme sua implementação real)
    // return await db.select().from(products).where(and(eq(products.active, true), ...));
    // Se não tiver essa função, ignore.
}