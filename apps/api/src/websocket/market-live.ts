import type { FastifyInstance } from "fastify";

export async function registerMarketWebSocket(app: FastifyInstance) {
  app.get("/market/live", { websocket: true }, (socket, request) => {
    const url = new URL(request.url, app.services.env.BACKEND_URL);
    const symbols = (url.searchParams.get("symbols") ?? "").split(",").map((symbol) => symbol.trim()).filter(Boolean).slice(0, 40);
    if (symbols.length === 0) {
      socket.send(JSON.stringify({ type: "error", message: "No symbols requested." }));
      socket.close();
      return;
    }
    let closed = false;
    const send = async () => {
      if (closed) return;
      try {
        const assets = await app.services.marketData.getBatchQuotes(symbols);
        socket.send(JSON.stringify({ type: "prices", assets, timestamp: new Date().toISOString() }));
      } catch (error) {
        socket.send(JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Live market data unavailable." }));
      }
    };
    void send();
    const timer = setInterval(send, 30_000);
    socket.on("close", () => {
      closed = true;
      clearInterval(timer);
    });
  });
}
