import { pgTable, serial, text, varchar, timestamp, decimal, boolean, pgEnum, integer } from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const componentTypeEnum = pgEnum("type", ["capacitor", "resistor", "indutor", "mosfet", "ci", "outros"]);
export const poStatusEnum = pgEnum("status", ["pendente", "aguardando_entrega", "recebido_parcial", "recebido", "cancelado"]);
export const serviceTypeEnum = pgEnum("serviceType", ["manutencao_industrial", "fitness_refrigeracao", "automacao_industrial"]);
export const osStatusEnum = pgEnum("os_status", [
  "aguardando_aprovacao", // Substitui 'aguardando_aprovacao'
  "aguardando_componente",
  "aprovado",
  "em_reparo",
  "sem_conserto",
  "pago",
  "entregue",
  "entregue_a_receber"
]);
// --- TABELAS ---

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

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  minQuantity: integer("minQuantity").default(0),
  sku: varchar("sku", { length: 100 }).unique(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").references(() => customers.id),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("concluido"),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  notes: text("notes"),
  saleDate: timestamp("saleDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const saleItems = pgTable("saleItems", {
  id: serial("id").primaryKey(),
  saleId: integer("saleId").references(() => sales.id).notNull(),
  productId: integer("productId").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
});

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

export const purchaseOrderItems = pgTable("purchaseOrderItems", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchaseOrderId").notNull(),
  componentId: integer("componentId"),
  productId: integer("productId").references(() => products.id),
  quantity: integer("quantity").notNull(),
  receivedQuantity: integer("receivedQuantity").default(0).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const serviceOrders = pgTable("serviceOrders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  customerId: integer("customerId").notNull(),
  serviceType: serviceTypeEnum("serviceType").notNull(),
  
  // Novos campos solicitados
  equipment: varchar("equipment", { length: 255 }), // Nome do Equipamento
  brand: varchar("brand", { length: 255 }),         // Marca
  model: varchar("model", { length: 255 }),         // Modelo
  serialNumber: varchar("serialNumber", { length: 255 }), // Número de Série

  equipmentDescription: text("equipmentDescription"),
  reportedIssue: text("reportedIssue"),
  diagnosis: text("diagnosis"),
  solution: text("solution"),
  // ... (restante dos campos existentes: status, receivedById, etc.)
  status: osStatusEnum("status").default("aguardando_aprovacao").notNull(),
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

// --- NOVA TABELA PARA USO DE COMPONENTES ---
export const serviceOrderComponents = pgTable("serviceOrderComponents", {
  id: serial("id").primaryKey(),
  serviceOrderId: integer("serviceOrderId").references(() => serviceOrders.id).notNull(),
  componentId: integer("componentId").references(() => components.id).notNull(),
  quantity: integer("quantity").notNull(), // Quantidade usada
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const serviceOrderImages = pgTable("serviceOrderImages", {
  id: serial("id").primaryKey(),
  serviceOrderId: integer("serviceOrderId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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

// --- TIPOS INFERIDOS ---

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export type Component = typeof components.$inferSelect;
export type InsertComponent = typeof components.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = typeof serviceOrders.$inferInsert;

export type ServiceOrderComponent = typeof serviceOrderComponents.$inferSelect;
export type InsertServiceOrderComponent = typeof serviceOrderComponents.$inferInsert;

export type ServiceOrderImage = typeof serviceOrderImages.$inferSelect;
export type InsertServiceOrderImage = typeof serviceOrderImages.$inferInsert;

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;