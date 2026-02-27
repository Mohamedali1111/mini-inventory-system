import dotenv from "dotenv";
import http from "http";

import { createApp } from "./app";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  const app = createApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on port ${PORT}`);
  });
}

void start();
