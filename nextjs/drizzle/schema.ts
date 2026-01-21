import { pgTable, serial, text, varchar, timestamp, decimal, boolean, pgEnum, integer } from "drizzle-orm/pg-core";

// Enums para PostgreSQL
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const componentTypeEnum = pgEnum("type", ["capacitor", "resistor", "indutor", "mosfet", "ci", "outros"]);
export const poStatusEnum = pgEnum("status", ["pendente", "recebido_parcial", "recebido", "cancelado"]);
export const serviceTypeEnum = pgEnum("serviceType", ["manutencao_industrial", "fitness_refrigeracao", "automacao_industrial"]);
export const osStatusEnum = pgEnum("os_status", [
  "aberto",
  "aguardando_componente",
  "aprovado",
  "em_reparo",
  "sem_conserto",
  "pago",
  "entregue",
  "entregue_a_receber"
]);
export const transactionTypeEnum = pgEnum("transaction_type", ["entrada", "saida"]);

/**
 * Tabela de Usuários
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de Funcionários
 */
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 100 }),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0.00"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Tabela de Clientes
 */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }).unique(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Tabela de Componentes
 */
export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: componentTypeEnum("type").notNull(),
  description: text("description"),
  specifications: text("specifications"),
  quantity: integer("quantity").default(0).notNull(),
  minQuantity: integer("minQuantity").default(0),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).default("0.00"),
  location: varchar("location", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  partNumber: varchar("partNumber", { length: 100 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Component = typeof components.$inferSelect;
export type InsertComponent = typeof components.$inferInsert;

/**
 * Tabela de Pedidos de Compra
 */
export const purchaseOrders = pgTable("purchaseOrders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  supplier: varchar("supplier", { length: 255 }),
  orderDate: timestamp("orderDate").notNull(),
  receivedDate: timestamp("receivedDate"),
  receivedById: integer("receivedById"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0.00"),
  status: poStatusEnum("status").default("pendente").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Itens dos Pedidos de Compra
 */
export const purchaseOrderItems = pgTable("purchaseOrderItems", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull(),
  componentId: integer("componentId").notNull(),
  quantity: integer("quantity").notNull(),
  receivedQuantity: integer("receivedQuantity").default(0).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

/**
 * Ordens de Serviço (OS)
 */
export const serviceOrders = pgTable("serviceOrders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  customerId: integer("customerId").notNull(),
  serviceType: serviceTypeEnum("serviceType").notNull(),
  equipmentDescription: text("equipmentDescription"),
  reportedIssue: text("reportedIssue"),
  diagnosis: text("diagnosis"),
  solution: text("solution"),
  status: osStatusEnum("status").default("aberto").notNull(),
  receivedById: integer("receivedById"),
  technicianId: integer("technicianId"),
  laborCost: decimal("laborCost", { precision: 10, scale: 2 }).default("0.00"),
  partsCost: decimal("partsCost", { precision: 10, scale: 2 }).default("0.00"),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).default("0.00"),
  receivedDate: timestamp("receivedDate").notNull(),
  completedDate: timestamp("completedDate"),
  deliveredDate: timestamp("deliveredDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = typeof serviceOrders.$inferInsert;

/**
 * Imagens das Ordens de Serviço
 */
export const serviceOrderImages = pgTable("serviceOrderImages", {
  id: serial("id").primaryKey(),
  serviceOrderId: integer("serviceOrderId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServiceOrderImage = typeof serviceOrderImages.$inferSelect;
export type InsertServiceOrderImage = typeof serviceOrderImages.$inferInsert;

/**
 * Transações Financeiras
 */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: transactionTypeEnum("type").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  serviceOrderId: integer("serviceOrderId"),
  purchaseOrderId: integer("purchaseOrderId"),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Comissões de Funcionários
 */
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employeeId").notNull(),
  serviceOrderId: integer("serviceOrderId").notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(),
  basedOnAmount: decimal("basedOnAmount", { precision: 10, scale: 2 }).notNull(),
  paid: boolean("paid").default(false).notNull(),
  paidDate: timestamp("paidDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;
