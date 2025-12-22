CREATE TABLE `commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`serviceOrderId` int NOT NULL,
	`commissionAmount` decimal(10,2) NOT NULL,
	`commissionRate` decimal(5,2) NOT NULL,
	`basedOnAmount` decimal(10,2) NOT NULL,
	`paid` boolean NOT NULL DEFAULT false,
	`paidDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('capacitor','resistor','indutor','mosfet','ci','outros') NOT NULL,
	`description` text,
	`specifications` text,
	`quantity` int NOT NULL DEFAULT 0,
	`minQuantity` int DEFAULT 0,
	`unitPrice` decimal(10,2) DEFAULT '0.00',
	`location` varchar(100),
	`manufacturer` varchar(255),
	`partNumber` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `components_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`cpfCnpj` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`role` varchar(100),
	`commissionRate` decimal(5,2) DEFAULT '0.00',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`componentId` int NOT NULL,
	`quantity` int NOT NULL,
	`receivedQuantity` int NOT NULL DEFAULT 0,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchaseOrderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`supplier` varchar(255),
	`orderDate` timestamp NOT NULL,
	`receivedDate` timestamp,
	`receivedById` int,
	`totalAmount` decimal(10,2) DEFAULT '0.00',
	`status` enum('pendente','recebido_parcial','recebido','cancelado') NOT NULL DEFAULT 'pendente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchaseOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchaseOrders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `serviceOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`customerId` int NOT NULL,
	`serviceType` enum('manutencao_industrial','fitness_refrigeracao','automacao_industrial') NOT NULL,
	`equipmentDescription` text,
	`reportedIssue` text,
	`diagnosis` text,
	`solution` text,
	`status` enum('aberto','aguardando_componente','aprovado','em_reparo','sem_conserto','pago','entregue','entregue_a_receber') NOT NULL DEFAULT 'aberto',
	`receivedById` int,
	`technicianId` int,
	`laborCost` decimal(10,2) DEFAULT '0.00',
	`partsCost` decimal(10,2) DEFAULT '0.00',
	`totalCost` decimal(10,2) DEFAULT '0.00',
	`receivedDate` timestamp NOT NULL,
	`completedDate` timestamp,
	`deliveredDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `serviceOrders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`serviceOrderId` int,
	`purchaseOrderId` int,
	`paymentMethod` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);