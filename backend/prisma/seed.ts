import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [whA, whB] = await Promise.all([
    prisma.warehouse.upsert({
      where: { id: "seed-wh-a" },
      update: {},
      create: {
        id: "seed-wh-a",
        name: "Main Warehouse",
        location: "HQ",
      },
    }),
    prisma.warehouse.upsert({
      where: { id: "seed-wh-b" },
      update: {},
      create: {
        id: "seed-wh-b",
        name: "Secondary Warehouse",
        location: "Remote",
      },
    }),
  ]);

  const [product1, product2] = await Promise.all([
    prisma.product.upsert({
      where: { sku: "SKU-001" },
      update: {},
      create: {
        sku: "SKU-001",
        name: "Sample Product A",
        description: "Seed product A",
      },
    }),
    prisma.product.upsert({
      where: { sku: "SKU-002" },
      update: {},
      create: {
        sku: "SKU-002",
        name: "Sample Product B",
        description: "Seed product B",
      },
    }),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: product1.id,
          warehouseId: whA.id,
        },
      },
      update: {
        quantity: 10,
      },
      create: {
        productId: product1.id,
        warehouseId: whA.id,
        quantity: 10,
      },
    });

    await tx.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: product1.id,
          warehouseId: whB.id,
        },
      },
      update: {
        quantity: 5,
      },
      create: {
        productId: product1.id,
        warehouseId: whB.id,
        quantity: 5,
      },
    });
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

