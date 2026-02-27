import { NextFunction, Request, Response } from "express";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = process.env.API_AUTH_TOKEN;

  // If no token is configured, treat auth as disabled to keep local setup simple.
  if (!token) {
    return next();
  }

  const provided = req.header("x-api-token");

  if (!provided || provided !== token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing API token",
      },
    });
  }

  return next();
}

