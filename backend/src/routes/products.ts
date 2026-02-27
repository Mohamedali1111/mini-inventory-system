import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AppError } from "../errors";

const router = Router();

const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid product payload");
    }

    const existing = await prisma.product.findUnique({
      where: { sku: parsed.data.sku },
    });
    if (existing) {
      throw new AppError(409, "SKU_EXISTS", "A product with this SKU already exists");
    }

    const product = await prisma.product.create({
      data: parsed.data,
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

export { router as productsRouter };

