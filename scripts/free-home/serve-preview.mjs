import { createServer } from "vite";
const server = await createServer({
  root: process.cwd(),
  optimizeDeps: { noDiscovery: true },
  server: { host: "127.0.0.1", port: 4188, strictPort: true },
});
await server.listen();
process.stdout.write("free-home preview http://127.0.0.1:4188/scripts/free-home/preview.html");
