import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { httpLogger } from "./logger";
import { productsRouter } from "./routes/products";
import { warehousesRouter } from "./routes/warehouses";
import { inventoryRouter } from "./routes/inventory";
import { AppError } from "./errors";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: "*",
    }),
  );
  app.use(express.json());
  app.use(httpLogger);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "mini-inventory-backend",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/products", productsRouter);
  app.use("/api/warehouses", warehousesRouter);
  app.use("/api", inventoryRouter);

  // 404 for unknown API routes
  app.use("/api", (_req, _res, next) => {
    next(new AppError(404, "NOT_FOUND", "Route not found"));
  });

  // Global error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    (req as any).log?.error({ err }, "Unhandled error");

    const isAppError = err instanceof AppError;
    const status = isAppError ? (err as AppError).statusCode : 500;
    const code = isAppError ? (err as AppError).code : "INTERNAL_SERVER_ERROR";
    const isProd = process.env.NODE_ENV === "production";

    res.status(status).json({
      success: false,
      error: {
        code,
        message: isProd && !isAppError ? "Internal server error" : err.message,
      },
    });
  });

  return app;
}

