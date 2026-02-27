import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: "*",
    }),
  );
  app.use(express.json());
  app.use(
    pinoHttp({
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    }),
  );

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // TODO: mount API routes here, e.g. /api/products

  // Global error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    // pino-http adds `log` on req
    (req as any).log?.error({ err }, "Unhandled error");
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}

