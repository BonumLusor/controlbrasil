import { eq, desc, sql, ilike, or } from "drizzle-orm";
import { getDb } from "./db";
import { customers } from "../drizzle/schema";

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: customers.id,
      company: customers.company,
      manager: customers.manager,
      email: customers.email,
      phone: customers.phone,
      cpfCnpj: customers.cpfCnpj,
      // CAMPOS ADICIONADOS AQUI:
      address: customers.address,
      city: customers.city,
      state: customers.state,
      zipCode: customers.zipCode,
      // -----------------------
      name: sql<string>`
        CASE 
          WHEN ${customers.company} IS NOT NULL AND ${customers.company} <> '' 
          THEN ${customers.company} || ' - ' || ${customers.manager} 
          ELSE ${customers.manager} 
        END`.as('name'),
      createdAt: customers.createdAt
    })
    .from(customers)
    .orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select() // Pega todos os campos raw (company, manager)
    .from(customers)
    .where(eq(customers.id, id));
    
  return result[0];
}

export async function createCustomer(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  
  return await db.insert(customers).values(data).returning();
}

export async function updateCustomer(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  
  return await db.update(customers).set({ ...data, updatedAt: new Date() }).where(eq(customers.id, id)).returning();
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  
  await db.delete(customers).where(eq(customers.id, id));
}

export async function searchCustomers(query: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
       id: customers.id,
       name: sql<string>`CASE WHEN ${customers.company} IS NOT NULL THEN ${customers.company} || ' - ' || ${customers.manager} ELSE ${customers.manager} END`.as('name'),
       phone: customers.phone
    })
    .from(customers)
    .where(or(
      ilike(customers.company, `%${query}%`),
      ilike(customers.manager, `%${query}%`),
      ilike(customers.email, `%${query}%`)
    ))
    .limit(10);
}