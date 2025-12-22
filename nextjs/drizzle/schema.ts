import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Password hash for local authentication
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Employees table - tracks technicians and staff
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 100 }), // Técnico, Atendente, etc.
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0.00"), // Percentage
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Customers table
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Electronic components inventory
 */
export const components = mysqlTable("components", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["capacitor", "resistor", "indutor", "mosfet", "ci", "outros"]).notNull(),
  description: text("description"),
  specifications: text("specifications"), // JSON string for detailed specs
  quantity: int("quantity").default(0).notNull(),
  minQuantity: int("minQuantity").default(0), // Minimum stock alert
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0.00"),
  location: varchar("location", { length: 100 }), // Storage location
  manufacturer: varchar("manufacturer", { length: 255 }),
  partNumber: varchar("partNumber", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Component = typeof components.$inferSelect;
export type InsertComponent = typeof components.$inferInsert;

/**
 * Purchase orders
 */
export const purchaseOrders = mysqlTable("purchaseOrders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  supplier: varchar("supplier", { length: 255 }),
  orderDate: timestamp("orderDate").notNull(),
  receivedDate: timestamp("receivedDate"),
  receivedById: int("receivedById"), // Employee who received
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0.00"),
  status: mysqlEnum("status", ["pendente", "recebido_parcial", "recebido", "cancelado"]).default("pendente").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Purchase order items
 */
export const purchaseOrderItems = mysqlTable("purchaseOrderItems", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  componentId: int("componentId").notNull(),
  quantity: int("quantity").notNull(),
  receivedQuantity: int("receivedQuantity").default(0).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

/**
 * Service orders
 */
export const serviceOrders = mysqlTable("serviceOrders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  serviceType: mysqlEnum("serviceType", ["manutencao_industrial", "fitness_refrigeracao", "automacao_industrial"]).notNull(),
  equipmentDescription: text("equipmentDescription"),
  reportedIssue: text("reportedIssue"),
  diagnosis: text("diagnosis"),
  solution: text("solution"),
  status: mysqlEnum("status", [
    "aberto",
    "aguardando_componente",
    "aprovado",
    "em_reparo",
    "sem_conserto",
    "pago",
    "entregue",
    "entregue_a_receber"
  ]).default("aberto").notNull(),
  receivedById: int("receivedById"), // Employee who received the order
  technicianId: int("technicianId"), // Employee who repaired
  laborCost: decimal("laborCost", { precision: 10, scale: 2 }).default("0.00"),
  partsCost: decimal("partsCost", { precision: 10, scale: 2 }).default("0.00"),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).default("0.00"),
  receivedDate: timestamp("receivedDate").notNull(),
  completedDate: timestamp("completedDate"),
  deliveredDate: timestamp("deliveredDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = typeof serviceOrders.$inferInsert;

/**
 * Financial transactions
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // Serviço, Compra de peças, Salário, etc.
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  serviceOrderId: int("serviceOrderId"), // Link to service order if applicable
  purchaseOrderId: int("purchaseOrderId"), // Link to purchase order if applicable
  paymentMethod: varchar("paymentMethod", { length: 50 }), // Dinheiro, Cartão, PIX, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Employee commissions
 */
export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  serviceOrderId: int("serviceOrderId").notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(),
  basedOnAmount: decimal("basedOnAmount", { precision: 10, scale: 2 }).notNull(),
  paid: boolean("paid").default(false).notNull(),
  paidDate: timestamp("paidDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;
