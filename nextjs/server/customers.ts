import { eq, desc, like, or } from "drizzle-orm";
import { getDb } from "./db";
import { customers, type Customer, type InsertCustomer } from "../drizzle/schema";

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number): Promise<Customer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(customers).where(
    or(
      like(customers.name, `%${query}%`),
      like(customers.email, `%${query}%`),
      like(customers.phone, `%${query}%`),
      like(customers.cpfCnpj, `%${query}%`)
    )
  ).orderBy(desc(customers.createdAt));
}

export async function createCustomer(data: InsertCustomer): Promise<Customer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(customers).values(data);
  const insertedId = Number(result[0].insertId);
  
  const customer = await getCustomerById(insertedId);
  if (!customer) throw new Error("Failed to create customer");
  
  return customer;
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(customers).set(data).where(eq(customers.id, id));
  
  const customer = await getCustomerById(id);
  if (!customer) throw new Error("Customer not found");
  
  return customer;
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(customers).where(eq(customers.id, id));
}
