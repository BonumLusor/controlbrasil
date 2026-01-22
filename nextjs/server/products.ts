import { getDb } from "./db";
import { products, type InsertProduct } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export async function getAllProducts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [product] = await db.select().from(products).where(eq(products.id, id));
  return product;
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [newProduct] = await db.insert(products).values(data).returning();
  return newProduct;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [updatedProduct] = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return updatedProduct;
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(products).where(eq(products.id, id));
}