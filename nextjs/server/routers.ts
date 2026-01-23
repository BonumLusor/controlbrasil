import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { authenticateUser, createUserWithPassword } from "./auth";
import { sdk } from "./_core/sdk";
import { protectedProcedure } from "./_core/trpc";
import * as employeesDb from "./employees";
import * as componentsDb from "./components";
import * as purchaseOrdersDb from "./purchaseOrders";
import * as customersDb from "./customers";
import * as serviceOrdersDb from "./serviceOrders";
import * as commissionsDb from "./commissions";
import * as reportsDb from "./reports";
import * as productsDb from "./products";
import * as salesDb from "./sales";
import { storagePut } from "./storage";
import { getAllSales, getSaleById, createSaleTransaction, cancelSale } from "./sales";

const optionalString = z.union([z.string(), z.literal(""), z.null(), z.undefined()]);
const optionalEmail = z.union([z.string().email(), z.literal(""), z.null(), z.undefined()]);
const cleanEmpty = (val: string | null | undefined) => (val === "" ? undefined : val);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        const result = await authenticateUser(input.email, input.password);
        if (!result.success || !result.user) return { success: false, error: result.error };
        const token = await sdk.createSessionToken(result.user.openId, { name: result.user.name || "", expiresInMs: 31536000000 });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 31536000000 });
        return { success: true, user: result.user };
      }),
    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().min(2) }))
      .mutation(async ({ input }) => createUserWithPassword(input.email, input.password, input.name)),
  }),

  employees: router({
    list: protectedProcedure.query(async () => employeesDb.getAllEmployees()),
    listActive: protectedProcedure.query(async () => employeesDb.getActiveEmployees()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => employeesDb.getEmployeeById(input.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2),
        email: optionalEmail,
        phone: z.string().optional(),
        role: z.string().optional(),
        commissionRate: z.string().optional(),
        active: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const data = { ...input, email: cleanEmpty(input.email) };
        // @ts-ignore
        return await employeesDb.createEmployee(data);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        email: optionalEmail,
        phone: z.string().optional(),
        role: z.string().optional(),
        commissionRate: z.string().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data = { ...rest, email: cleanEmpty(rest.email) };
        // @ts-ignore
        return await employeesDb.updateEmployee(id, data);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await employeesDb.deleteEmployee(input.id);
      return { success: true };
    }),
  }),

  // --- PRODUTOS (Revenda) ---
  products: router({
    list: protectedProcedure.query(async () => productsDb.getAllProducts()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => productsDb.getProductById(input.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string(),
        quantity: z.number().default(0),
        minQuantity: z.number().optional(),
        sku: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const data = { ...input, sku: cleanEmpty(input.sku) };
        return await productsDb.createProduct(data);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        quantity: z.number().optional(),
        minQuantity: z.number().optional(),
        sku: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await productsDb.updateProduct(id, data);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await productsDb.deleteProduct(input.id);
      return { success: true };
    }),
  }),

  // --- VENDAS ---
  sales: router({
    list: protectedProcedure.query(async () => salesDb.getAllSales()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => salesDb.getSaleById(input.id)),
    create: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        totalAmount: z.number(),
        paymentMethod: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
        }))
      }))
      .mutation(async ({ input }) => {
        return await salesDb.createSaleTransaction(input);
      }),
    
    // Rota para mudar status (Cancelar, Devolver, Reaprovar)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["concluido", "cancelado", "devolvido"])
      }))
      .mutation(async ({ input }) => {
        return await salesDb.updateSaleStatus(input.id, input.status);
      }),

    // Rota para Excluir Definitivamente
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await salesDb.deleteSale(input.id);
      }),
  }),
  components: router({
    list: protectedProcedure.query(async () => componentsDb.getAllComponents()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => componentsDb.getComponentById(input.id)),
    getByType: protectedProcedure.input(z.object({ type: z.string() })).query(async ({ input }) => componentsDb.getComponentsByType(input.type)),
    getLowStock: protectedProcedure.query(async () => componentsDb.getLowStockComponents()),
    search: protectedProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => componentsDb.searchComponents(input.query)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["capacitor", "resistor", "indutor", "mosfet", "ci", "outros"]),
        description: z.string().optional(),
        specifications: z.string().optional(),
        quantity: z.number().default(0),
        minQuantity: z.number().optional(),
        unitPrice: z.string().optional(),
        location: z.string().optional(),
        manufacturer: z.string().optional(),
        partNumber: optionalString,
      }))
      .mutation(async ({ input }) => {
        const data = { ...input, partNumber: cleanEmpty(input.partNumber) };
        // @ts-ignore
        return await componentsDb.createComponent(data);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        type: z.enum(["capacitor", "resistor", "indutor", "mosfet", "ci", "outros"]).optional(),
        description: z.string().optional(),
        specifications: z.string().optional(),
        quantity: z.number().optional(),
        minQuantity: z.number().optional(),
        unitPrice: z.string().optional(),
        location: z.string().optional(),
        manufacturer: z.string().optional(),
        partNumber: optionalString,
      }))
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data = { ...rest, partNumber: cleanEmpty(rest.partNumber) };
        // @ts-ignore
        return await componentsDb.updateComponent(id, data);
      }),
    updateQuantity: protectedProcedure
      .input(z.object({ id: z.number(), quantityChange: z.number() }))
      .mutation(async ({ input }) => componentsDb.updateComponentQuantity(input.id, input.quantityChange)),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await componentsDb.deleteComponent(input.id);
      return { success: true };
    }),
  }),

  purchaseOrders: router({
    list: protectedProcedure.query(async () => purchaseOrdersDb.getAllPurchaseOrders()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => purchaseOrdersDb.getPurchaseOrderById(input.id)),
    getItems: protectedProcedure.input(z.object({ purchaseOrderId: z.number() })).query(async ({ input }) => purchaseOrdersDb.getPurchaseOrderItems(input.purchaseOrderId)),
    create: protectedProcedure
      .input(z.object({
        orderNumber: z.string().min(1),
        supplier: z.string().optional(),
        orderDate: z.date(),
        notes: z.string().optional(),
        items: z.array(z.object({
          componentId: z.number().optional(),
          productId: z.number().optional(),
          quantity: z.number(),
          unitPrice: z.string(),
          totalPrice: z.string(),
        })).refine((items) => items.every(item => item.componentId || item.productId), {
          message: "Cada item deve ter um componente ou um produto vinculado."
        }),
      }))
      .mutation(async ({ input }) => {
        const { items, ...orderData } = input;
        return await purchaseOrdersDb.createPurchaseOrder(orderData, items);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        orderNumber: z.string().optional(),
        supplier: z.string().optional(),
        orderDate: z.date().optional(),
        notes: z.string().optional(),
        status: z.enum(["pendente", "aguardando_entrega", "recebido_parcial", "recebido", "cancelado"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await purchaseOrdersDb.updatePurchaseOrder(id, data);
      }),
    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => purchaseOrdersDb.approvePurchaseOrder(input.id)),
    receiveAll: protectedProcedure
      .input(z.object({
        id: z.number(),
        receivedById: z.number()
      }))
      .mutation(async ({ input }) => purchaseOrdersDb.fullyReceivePurchaseOrder(input.id, input.receivedById)),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await purchaseOrdersDb.deletePurchaseOrder(input.id);
      return { success: true };
    }),
  }),

  customers: router({
    list: protectedProcedure.query(async () => customersDb.getAllCustomers()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => customersDb.getCustomerById(input.id)),
    search: protectedProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => customersDb.searchCustomers(input.query)),
    create: protectedProcedure
      .input(z.object({
        company: z.string().optional(),     // Novo
        manager: z.string().min(2),         // Novo (Obrigatório)
        email: optionalEmail,
        phone: z.string().optional(),
        cpfCnpj: optionalString,
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const data = { 
          ...input, 
          email: cleanEmpty(input.email),
          cpfCnpj: cleanEmpty(input.cpfCnpj)
        };
        // @ts-ignore
        return await customersDb.createCustomer(data);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        company: z.string().optional(),
        manager: z.string().min(2).optional(),
        email: optionalEmail,
        phone: z.string().optional(),
        cpfCnpj: optionalString,
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data = { 
          ...rest, 
          email: cleanEmpty(rest.email),
          cpfCnpj: cleanEmpty(rest.cpfCnpj)
        };
        // @ts-ignore
        return await customersDb.updateCustomer(id, data);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await customersDb.deleteCustomer(input.id);
      return { success: true };
    }),
  }),

  serviceOrders: router({
    list: protectedProcedure.query(async () => serviceOrdersDb.getAllServiceOrders()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => serviceOrdersDb.getServiceOrderById(input.id)),
    getByStatus: protectedProcedure.input(z.object({ status: z.string() })).query(async ({ input }) => serviceOrdersDb.getServiceOrdersByStatus(input.status)),
    getByCustomer: protectedProcedure.input(z.object({ customerId: z.number() })).query(async ({ input }) => serviceOrdersDb.getServiceOrdersByCustomer(input.customerId)),
    getNextNumber: protectedProcedure.query(async () => serviceOrdersDb.getNextOrderNumber()),
    uploadImage: protectedProcedure
      .input(z.object({ 
        file: z.string(), 
        fileName: z.string() 
      }))
      .mutation(async ({ input }) => {
        const base64Data = input.file.split(';base64,').pop() || "";
        const buffer = Buffer.from(base64Data, 'base64');
        const path = `service-orders/${Date.now()}-${input.fileName}`;
        const result = await storagePut(path, buffer, "image/jpeg");
        return { url: result.url };
      }),
    create: protectedProcedure
      .input(z.object({
        orderNumber: z.string().min(1),
        customerId: z.number(),
        serviceType: z.enum(["manutencao_industrial", "fitness_refrigeracao", "automacao_industrial"]),
        // --- NOVOS CAMPOS DO EQUIPAMENTO ---
        equipment: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        serialNumber: z.string().optional(),
        // ------------------------------------
        equipmentDescription: z.string().optional(),
        reportedIssue: z.string().optional(),
        diagnosis: z.string().optional(),
        solution: z.string().optional(),
        status: z.enum(["aguardando_aprovacao", "aguardando_componente", "aprovado", "em_reparo", "sem_conserto", "pago", "entregue", "entregue_a_receber"]).default("aguardando_aprovacao"),
        receivedById: z.number().optional(),
        technicianId: z.number().optional(),
        laborCost: z.string().optional(),
        partsCost: z.string().optional(),
        totalCost: z.string().optional(),
        receivedDate: z.date(),
        notes: z.string().optional(),
        images: z.array(z.string()).optional(),
        // --- NOVO CAMPO DE COMPONENTES USADOS ---
        usedComponents: z.array(z.object({
          componentId: z.number(),
          quantity: z.number()
        })).optional()
        // ----------------------------------------
      }))
      .mutation(async ({ input }) => {
        const { images, usedComponents, ...data } = input;
        // Passa usedComponents para a função do DB
        return serviceOrdersDb.createServiceOrder(data, images, usedComponents);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        orderNumber: z.string().optional(),
        customerId: z.number().optional(),
        serviceType: z.enum(["manutencao_industrial", "fitness_refrigeracao", "automacao_industrial"]).optional(),
        // --- NOVOS CAMPOS DO EQUIPAMENTO ---
        equipment: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        serialNumber: z.string().optional(),
        // ------------------------------------
        equipmentDescription: z.string().optional(),
        reportedIssue: z.string().optional(),
        diagnosis: z.string().optional(),
        solution: z.string().optional(),
        status: z.enum(["aguardando_aprovacao", "aguardando_componente", "aprovado", "em_reparo", "sem_conserto", "pago", "entregue", "entregue_a_receber"]).optional(),
        receivedById: z.number().optional(),
        technicianId: z.number().optional(),
        laborCost: z.string().optional(),
        partsCost: z.string().optional(),
        totalCost: z.string().optional(),
        completedDate: z.date().optional(),
        deliveredDate: z.date().optional(),
        notes: z.string().optional(),
        images: z.array(z.string()).optional(),
        // --- NOVO CAMPO DE COMPONENTES USADOS ---
        usedComponents: z.array(z.object({
          componentId: z.number(),
          quantity: z.number()
        })).optional()
        // ----------------------------------------
      }))
      .mutation(async ({ input }) => {
        const { id, images, usedComponents, ...data } = input;
        // Passa usedComponents para a função do DB
        return await serviceOrdersDb.updateServiceOrder(id, data, images, usedComponents);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await serviceOrdersDb.deleteServiceOrder(input.id);
      return { success: true };
    }),
  }),

  commissions: router({
    calculate: protectedProcedure
      .input(z.object({ employeeId: z.number(), serviceOrderId: z.number(), amount: z.string() }))
      .mutation(async ({ input }) => commissionsDb.calculateCommission(input.employeeId, input.serviceOrderId, input.amount)),
    getByEmployee: protectedProcedure.input(z.object({ employeeId: z.number() })).query(async ({ input }) => commissionsDb.getCommissionsByEmployee(input.employeeId)),
    getPending: protectedProcedure.input(z.object({ employeeId: z.number().optional() })).query(async ({ input }) => commissionsDb.getPendingCommissions(input.employeeId)),
    pay: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => commissionsDb.payCommission(input.id)),
  }),

  reports: router({
    monthly: protectedProcedure.input(z.object({ year: z.number(), month: z.number() })).query(async ({ input }) => reportsDb.getMonthlyReport(input.year, input.month)),
    yearly: protectedProcedure.input(z.object({ year: z.number() })).query(async ({ input }) => reportsDb.getYearlyReport(input.year)),
    byCategory: protectedProcedure.input(z.object({ year: z.number(), month: z.number() })).query(async ({ input }) => reportsDb.getRevenueByCategory(input.year, input.month)),
    byCustomer: protectedProcedure.input(z.object({ year: z.number(), month: z.number() })).query(async ({ input }) => reportsDb.getRevenueByCustomer(input.year, input.month)),
  }),
});

export type AppRouter = typeof appRouter;