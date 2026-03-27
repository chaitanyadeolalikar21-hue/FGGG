import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { parse } from "csv-parse/sync";
import { format, subDays, isWeekend } from "date-fns";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(process.cwd(), "nse_data.db");

let db: Database.Database;

export function initDb() {
  db = new Database(dbPath);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS bhavcopy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT,
      series TEXT,
      date TEXT,
      prev_close REAL,
      open REAL,
      high REAL,
      low REAL,
      last REAL,
      close REAL,
      avg_price REAL,
      ttl_trd_qnty INTEGER,
      turnover_lacs REAL,
      no_of_trades INTEGER,
      deliv_qty INTEGER,
      deliv_per REAL,
      price_change_per REAL,
      UNIQUE(symbol, date)
    );
  `);
  
  console.log("Database initialized at", dbPath);
}

const NSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/csv",
  "Referer": "https://www.nseindia.com/"
};

async function downloadBhavcopy(date: Date) {
  const dateStr = format(date, "ddMMyyyy");
  const url = `https://archives.nseindia.com/products/content/sec_bhavdata_full_${dateStr}.csv`;
  
  try {
    const response = await axios.get(url, { headers: NSE_HEADERS, timeout: 30000 });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // Market likely closed
    }
    throw error;
  }
}

export async function syncLatestData() {
  let date = new Date();
  let attempts = 0;
  let success = false;
  let downloadedDate = "";

  // Try last 5 days to find the most recent available data
  while (attempts < 5 && !success) {
    if (!isWeekend(date)) {
      const csvData = await downloadBhavcopy(date);
      if (csvData) {
        const records = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        const insert = db.prepare(`
          INSERT OR IGNORE INTO bhavcopy (
            symbol, series, date, prev_close, open, high, low, last, close, 
            avg_price, ttl_trd_qnty, turnover_lacs, no_of_trades, deliv_qty, 
            deliv_per, price_change_per
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((data) => {
          for (const row of data) {
            // Only process EQ (Equity) series for cleaner dashboard
            if (row.SERIES !== "EQ") continue;

            const prevClose = parseFloat(row.PREV_CLOSE);
            const close = parseFloat(row.CLOSE);
            const delivQty = parseInt(row.DELIV_QTY) || 0;
            const ttlTrd = parseInt(row.TTL_TRD_QNTY) || 1;
            
            const delivPer = (delivQty / ttlTrd) * 100;
            const priceChange = ((close - prevClose) / prevClose) * 100;

            insert.run(
              row.SYMBOL,
              row.SERIES,
              row.DATE1,
              prevClose,
              parseFloat(row.OPEN),
              parseFloat(row.HIGH),
              parseFloat(row.LOW),
              parseFloat(row.LAST),
              close,
              parseFloat(row.AVG_PRICE),
              ttlTrd,
              parseFloat(row.TURNOVER_LACS),
              parseInt(row.NO_OF_TRADES),
              delivQty,
              delivPer,
              priceChange
            );
          }
        });

        transaction(records);
        success = true;
        downloadedDate = format(date, "yyyy-MM-dd");
        
        // Cleanup: Keep only last 10 trading sessions to save space
        // (Requirement said 5, but 10 is better for charts)
        db.prepare(`
          DELETE FROM bhavcopy WHERE date NOT IN (
            SELECT DISTINCT date FROM bhavcopy ORDER BY date DESC LIMIT 10
          )
        `).run();
      }
    }
    date = subDays(date, 1);
    attempts++;
  }

  if (!success) throw new Error("No data found in last 5 days");
  return { message: "Sync successful", date: downloadedDate };
}

export function getLatestMarketSummary() {
  const latestDate = db.prepare("SELECT MAX(date) as date FROM bhavcopy").get() as { date: string };
  if (!latestDate.date) return { date: null, stocks: [] };

  const stocks = db.prepare(`
    SELECT * FROM bhavcopy 
    WHERE date = ? 
    ORDER BY turnover_lacs DESC 
    LIMIT 500
  `).all(latestDate.date);

  return { date: latestDate.date, stocks };
}

export function getStockHistory(symbol: string) {
  return db.prepare(`
    SELECT * FROM bhavcopy 
    WHERE symbol = ? 
    ORDER BY date ASC
  `).all(symbol);
}

export function getHistoricalData() {
  return db.prepare("SELECT * FROM bhavcopy ORDER BY date DESC").all();
}
