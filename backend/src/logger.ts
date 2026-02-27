import pino from "pino";
import pinoHttp from "pino-http";
import { v4 as uuidv4 } from "uuid";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req.id as string) || uuidv4(),
  serializers: {
    req(request) {
      return {
        id: request.id,
        method: request.method,
        url: request.url,
      };
    },
    res(reply) {
      return {
        statusCode: reply.statusCode,
      };
    },
  },
});

