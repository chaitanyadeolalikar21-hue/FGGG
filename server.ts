import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { 
  initDb, 
  getHistoricalData, 
  getLatestMarketSummary, 
  getStockHistory,
  syncLatestData
} from "./src/services/db.ts";
import cron from "node-cron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database
  initDb();

  app.use(express.json());

  // API Routes
  app.get("/api/market-summary", async (req, res) => {
    try {
      const data = getLatestMarketSummary();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market summary" });
    }
  });

  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      const data = getStockHistory(req.params.symbol);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock history" });
    }
  });

  app.post("/api/sync", async (req, res) => {
    try {
      const result = await syncLatestData();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Sync failed" });
    }
  });

  // Background Scheduler: Run every day at 6:30 PM IST (approx 13:00 UTC)
  cron.schedule("0 13 * * *", async () => {
    console.log("Running scheduled NSE data sync...");
    try {
      await syncLatestData();
    } catch (err) {
      console.error("Scheduled sync failed:", err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
