Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'WORKER');

-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('RECEIVE', 'QUICK', 'INVENTORY', 'SALES');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('TO_RV', 'FROM_RV');

-- CreateEnum
CREATE TYPE "LabelType" AS ENUM ('RECEIVING', 'SALES');

-- CreateEnum
CREATE TYPE "PrinterType" AS ENUM ('THERMAL', 'LASER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "buildingId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "scanType" "ScanType" NOT NULL,
    "poNumber" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "ticketNumber" TEXT,
    "buildingId" TEXT,
    "userId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedToRvAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "labelType" "LabelType" NOT NULL,
    "poNumber" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "ticketNumber" TEXT,
    "buildingCode" TEXT,
    "receivedDate" TIMESTAMP(3),
    "printedAt" TIMESTAMP(3),
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoCache" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendor" TEXT,
    "status" TEXT,
    "expectedDate" TIMESTAMP(3),
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoLineCache" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "qtyOrdered" INTEGER NOT NULL DEFAULT 0,
    "qtyReceived" INTEGER NOT NULL DEFAULT 0,
    "itemCost" DOUBLE PRECISION,
    "barcode" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoLineCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncQueue" (
    "id" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SyncQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PrinterType" NOT NULL,
    "ipAddress" TEXT,
    "buildingId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Building_code_key" ON "Building"("code");

-- CreateIndex
CREATE INDEX "Scan_barcode_idx" ON "Scan"("barcode");

-- CreateIndex
CREATE INDEX "Scan_poNumber_idx" ON "Scan"("poNumber");

-- CreateIndex
CREATE INDEX "Scan_scannedAt_idx" ON "Scan"("scannedAt");

-- CreateIndex
CREATE INDEX "Scan_syncStatus_idx" ON "Scan"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Label_barcode_key" ON "Label"("barcode");

-- CreateIndex
CREATE INDEX "Label_barcode_idx" ON "Label"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "PoCache_poNumber_key" ON "PoCache"("poNumber");

-- CreateIndex
CREATE INDEX "PoLineCache_poId_idx" ON "PoLineCache"("poId");

-- CreateIndex
CREATE INDEX "PoLineCache_sku_idx" ON "PoLineCache"("sku");

-- CreateIndex
CREATE INDEX "SyncQueue_status_idx" ON "SyncQueue"("status");

-- CreateIndex
CREATE INDEX "SyncQueue_direction_idx" ON "SyncQueue"("direction");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoLineCache" ADD CONSTRAINT "PoLineCache_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PoCache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

