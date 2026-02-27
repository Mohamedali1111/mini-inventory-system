import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";

const TEST_TOKEN = "test-token";

// Ensure the app is created with auth enabled for tests.
process.env.API_AUTH_TOKEN = TEST_TOKEN;

const app = createApp();

describe("stock transfer operations", () => {
  let productId: string;
  let warehouseAId: string;
  let warehouseBId: string;

  beforeAll(async () => {
    // Clean relevant tables
    await prisma.stockMovement.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.product.deleteMany();

    const [whA, whB] = await Promise.all([
      prisma.warehouse.create({
        data: { name: "WH A" },
      }),
      prisma.warehouse.create({
        data: { name: "WH B" },
      }),
    ]);

    const product = await prisma.product.create({
      data: {
        sku: "TEST-001",
        name: "Test Product",
      },
    });

    await prisma.inventory.create({
      data: {
        productId: product.id,
        warehouseId: whA.id,
        quantity: 10,
      },
    });

    warehouseAId = whA.id;
    warehouseBId = whB.id;
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("transfers stock and updates both warehouses", async () => {
    const res = await request(app)
      .post("/api/stock/transfer")
      .set("x-api-token", TEST_TOKEN)
      .send({
        productId,
        fromWarehouseId: warehouseAId,
        toWarehouseId: warehouseBId,
        quantity: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const from = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId: warehouseAId,
        },
      },
    });

    const to = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId: warehouseBId,
        },
      },
    });

    expect(from?.quantity).toBe(5);
    expect(to?.quantity).toBe(5);
  });

  it("returns 400 when transferring more than available stock", async () => {
    const res = await request(app)
      .post("/api/stock/transfer")
      .set("x-api-token", TEST_TOKEN)
      .send({
        productId,
        fromWarehouseId: warehouseAId,
        toWarehouseId: warehouseBId,
        quantity: 10_000,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
  });
}
);

