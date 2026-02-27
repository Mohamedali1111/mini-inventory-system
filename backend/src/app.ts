import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { httpLogger } from "./logger";

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

  // TODO: mount API routes here, e.g. /api/products

  // Global error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    (req as any).log?.error({ err }, "Unhandled error");

    const status = res.statusCode >= 400 ? res.statusCode : 500;
    const isProd = process.env.NODE_ENV === "production";

    res.status(status).json({
      success: false,
      error: {
        code: status === 500 ? "INTERNAL_SERVER_ERROR" : "UNHANDLED_ERROR",
        message: isProd ? "Internal server error" : err.message,
      },
    });
  });

  return app;
}

