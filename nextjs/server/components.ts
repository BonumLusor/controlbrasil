import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { getDb } from "./db";
import { components, type Component, type InsertComponent } from "../drizzle/schema";

export async function getAllComponents(): Promise<Component[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(components).orderBy(desc(components.createdAt));
}

export async function getComponentById(id: number): Promise<Component | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(components).where(eq(components.id, id)).limit(1);
  return result[0];
}

export async function getComponentsByType(type: string): Promise<Component[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(components).where(eq(components.type, type as any)).orderBy(desc(components.createdAt));
}

export async function getLowStockComponents(): Promise<Component[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(components).where(
    sql`${components.quantity} <= ${components.minQuantity}`
  ).orderBy(desc(components.createdAt));
}

export async function searchComponents(query: string): Promise<Component[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(components).where(
    or(
      like(components.name, `%${query}%`),
      like(components.partNumber, `%${query}%`),
      like(components.manufacturer, `%${query}%`)
    )
  ).orderBy(desc(components.createdAt));
}

export async function createComponent(data: InsertComponent): Promise<Component> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(components).values(data);
  const insertedId = Number(result[0].insertId);
  
  const component = await getComponentById(insertedId);
  if (!component) throw new Error("Failed to create component");
  
  return component;
}

export async function updateComponent(id: number, data: Partial<InsertComponent>): Promise<Component> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(components).set(data).where(eq(components.id, id));
  
  const component = await getComponentById(id);
  if (!component) throw new Error("Component not found");
  
  return component;
}

export async function updateComponentQuantity(id: number, quantityChange: number): Promise<Component> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(components).set({
    quantity: sql`${components.quantity} + ${quantityChange}`
  }).where(eq(components.id, id));
  
  const component = await getComponentById(id);
  if (!component) throw new Error("Component not found");
  
  return component;
}

export async function deleteComponent(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(components).where(eq(components.id, id));
}
