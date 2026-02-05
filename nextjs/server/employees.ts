import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { employees, type Employee, type InsertEmployee } from "../drizzle/schema";

export async function getAllEmployees(): Promise<Employee[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(employees).orderBy(desc(employees.createdAt));
}

export async function getEmployeeById(id: number): Promise<Employee | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(employees).where(eq(employees.active, true)).orderBy(desc(employees.createdAt));
}

export async function createEmployee(data: InsertEmployee): Promise<Employee> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(employees).values(data).returning({ id: employees.id });
  const insertedId = result[0]?.id;
  
  if (!insertedId) throw new Error("Failed to create employee");

  const employee = await getEmployeeById(insertedId);
  if (!employee) throw new Error("Failed to create employee");
  
  return employee;
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(employees).set(data).where(eq(employees.id, id));
  
  const employee = await getEmployeeById(id);
  if (!employee) throw new Error("Employee not found");
  
  return employee;
}

export async function deleteEmployee(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(employees).where(eq(employees.id, id));
}