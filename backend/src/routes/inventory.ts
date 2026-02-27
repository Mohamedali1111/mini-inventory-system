import { Router } from "express";
import { z } from "zod";
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { AppError } from "../errors";

const router = Router();

// Get inventory for a product, grouped by warehouse
router.get("/products/:productId/inventory", async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!product) {
      throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
    }

    const inventory = product.inventory.map((inv: (typeof product.inventory)[number]) => ({
      warehouseId: inv.warehouseId,
      warehouseName: inv.warehouse.name,
      quantity: inv.quantity,
    }));

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
        },
        inventory,
      },
    });
  } catch (err) {
    next(err);
  }
});

const stockChangeSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const stockTransferSchema = z.object({
  productId: z.string().min(1),
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  quantity: z.number().int().positive(),
});

router.post("/stock/add", async (req, res, next): Promise<void> => {
  try {
    const parsed = stockChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid add stock payload");
    }

    const { productId, warehouseId, quantity } = parsed.data;

    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
      }

      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) {
        throw new AppError(404, "WAREHOUSE_NOT_FOUND", "Warehouse not found");
      }

      const existing = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });

      const inventory = existing
        ? await tx.inventory.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + quantity },
          })
        : await tx.inventory.create({
            data: {
              productId,
              warehouseId,
              quantity,
            },
          });

      await tx.stockMovement.create({
        data: {
          productId,
          toWarehouseId: warehouseId,
          quantity,
          type: "ADD",
        },
      });

      return inventory;
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/stock/remove", async (req, res, next) => {
  try {
    const parsed = stockChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid remove stock payload");
    }

    const { productId, warehouseId, quantity } = parsed.data;

    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });

      if (!inventory) {
        throw new AppError(404, "INVENTORY_NOT_FOUND", "Inventory entry not found");
      }

      const updateResult = await tx.inventory.updateMany({
        where: {
          id: inventory.id,
          quantity: { gte: quantity },
        },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      if (updateResult.count === 0) {
        throw new AppError(400, "INSUFFICIENT_STOCK", "Not enough stock to remove");
      }

      const updated = await tx.inventory.findUnique({
        where: { id: inventory.id },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          fromWarehouseId: warehouseId,
          quantity,
          type: "REMOVE",
        },
      });

      return updated;
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post("/stock/transfer", async (req, res, next) => {
  try {
    const parsed = stockTransferSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid transfer stock payload");
    }

    const { productId, fromWarehouseId, toWarehouseId, quantity } = parsed.data;

    if (fromWarehouseId === toWarehouseId) {
      throw new AppError(400, "INVALID_TRANSFER", "Source and target warehouses must be different");
    }

    const result = await prisma.$transaction(async (tx: PrismaClient) => {
      const [fromInventory, toInventory, product, fromWarehouse, toWarehouse] = await Promise.all([
        tx.inventory.findUnique({
          where: {
            productId_warehouseId: { productId, warehouseId: fromWarehouseId },
          },
        }),
        tx.inventory.findUnique({
          where: {
            productId_warehouseId: { productId, warehouseId: toWarehouseId },
          },
        }),
        tx.product.findUnique({ where: { id: productId } }),
        tx.warehouse.findUnique({ where: { id: fromWarehouseId } }),
        tx.warehouse.findUnique({ where: { id: toWarehouseId } }),
      ]);

      if (!product) {
        throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
      }
      if (!fromWarehouse || !toWarehouse) {
        throw new AppError(404, "WAREHOUSE_NOT_FOUND", "One or both warehouses not found");
      }
      if (!fromInventory) {
        throw new AppError(404, "INVENTORY_NOT_FOUND", "Inventory entry not found for source warehouse");
      }

      const updateFromResult = await tx.inventory.updateMany({
        where: {
          id: fromInventory.id,
          quantity: { gte: quantity },
        },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      if (updateFromResult.count === 0) {
        throw new AppError(400, "INSUFFICIENT_STOCK", "Not enough stock to transfer");
      }

      const updatedFrom = await tx.inventory.findUnique({
        where: { id: fromInventory.id },
      });

      const updatedTo = toInventory
        ? await tx.inventory.update({
            where: { id: toInventory.id },
            data: { quantity: toInventory.quantity + quantity },
          })
        : await tx.inventory.create({
            data: {
              productId,
              warehouseId: toWarehouseId,
              quantity,
            },
          });

      await tx.stockMovement.create({
        data: {
          productId,
          fromWarehouseId,
          toWarehouseId,
          quantity,
          type: "TRANSFER",
        },
      });

      return {
        from: updatedFrom,
        to: updatedTo,
      };
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export { router as inventoryRouter };

