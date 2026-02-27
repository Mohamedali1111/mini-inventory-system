import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

prisma
  .$connect()
  .then(() => {
    logger.info("Connected to database");
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to database");
  });

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export { prisma };

