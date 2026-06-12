import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`SVO-MCP listening on http://0.0.0.0:${port}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down SVO-MCP.`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
