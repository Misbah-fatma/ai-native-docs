/**
 * Single public origin for the live demo.
 * /api → Express (4000)
 * everything else → Vite (5173)
 */
import http from "node:http";

const PORT = Number(process.env.LIVE_PORT || 8080);
const API = new URL(process.env.API_ORIGIN || "http://127.0.0.1:4000");
const WEB = new URL(process.env.WEB_ORIGIN || "http://localhost:5173");

function targetFor(urlPath) {
  return urlPath.startsWith("/api") ? API : WEB;
}

const server = http.createServer((req, res) => {
  const target = targetFor(req.url || "/");
  const headers = { ...req.headers, host: target.host };
  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("Ink live proxy: backend or frontend is not running.");
  });
  req.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  const target = targetFor(req.url || "/");
  const proxyReq = http.request({
    hostname: target.hostname,
    port: target.port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: target.host },
  });
  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    socket.write(describeUpgrade(proxyRes));
    proxySocket.write(head);
    proxySocket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on("error", () => socket.destroy());
  proxyReq.end();
});

function describeUpgrade(proxyRes) {
  const lines = [`HTTP/1.1 ${proxyRes.statusCode} Switching Protocols`];
  for (const [key, value] of Object.entries(proxyRes.headers)) {
    lines.push(`${key}: ${value}`);
  }
  return `${lines.join("\r\n")}\r\n\r\n`;
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Live proxy http://127.0.0.1:${PORT}  (web ${WEB.origin}  api ${API.origin})`);
});
