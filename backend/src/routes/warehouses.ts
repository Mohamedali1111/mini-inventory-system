import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AppError } from "../errors";

const router = Router();

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: warehouses });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = createWarehouseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid warehouse payload");
    }

    const warehouse = await prisma.warehouse.create({
      data: parsed.data,
    });

    res.status(201).json({ success: true, data: warehouse });
  } catch (err) {
    next(err);
  }
});

export { router as warehousesRouter };

