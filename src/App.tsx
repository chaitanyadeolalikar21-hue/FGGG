/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Search, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { cn, formatNumber, formatCurrency } from './lib/utils';

interface StockData {
  symbol: string;
  date: string;
  close: number;
  prev_close: number;
  price_change_per: number;
  deliv_per: number;
  ttl_trd_qnty: number;
  turnover_lacs: number;
  high: number;
  low: number;
}

export default function App() {
  const [marketData, setMarketData] = useState<{ date: string | null; stocks: StockData[] }>({ date: null, stocks: [] });
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers' | 'delivery'>('all');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/market-summary');
      const data = await res.json();
      setMarketData(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch data", error);
      setLoading(false);
    }
  };

  const fetchStockHistory = async (symbol: string) => {
    try {
      const res = await fetch(`/api/stock/${symbol}`);
      const data = await res.json();
      setStockHistory(data);
    } catch (error) {
      console.error("Failed to fetch stock history", error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus('Connecting to NSE Archives...');
    try {
      setSyncStatus('Downloading Bhavcopy CSV...');
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      setSyncStatus('Processing and saving data...');
      await fetchData();
      setSyncStatus('Sync complete!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (error) {
      setSyncStatus('Sync failed. Please try again later.');
      alert("Sync failed. NSE might not have released today's data yet.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStock) {
      fetchStockHistory(selectedStock);
    }
  }, [selectedStock]);

  const filteredStocks = useMemo(() => {
    let result = marketData.stocks.filter(s => 
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filter === 'gainers') result = result.filter(s => s.price_change_per > 0).sort((a, b) => b.price_change_per - a.price_change_per);
    if (filter === 'losers') result = result.filter(s => s.price_change_per < 0).sort((a, b) => a.price_change_per - b.price_change_per);
    if (filter === 'delivery') result = result.filter(s => s.deliv_per > 60).sort((a, b) => b.deliv_per - a.deliv_per);

    return result.slice(0, 50);
  }, [marketData.stocks, searchTerm, filter]);

  const topGainers = useMemo(() => 
    [...marketData.stocks].sort((a, b) => b.price_change_per - a.price_change_per).slice(0, 5),
    [marketData.stocks]
  );

  const highDelivery = useMemo(() => 
    [...marketData.stocks].sort((a, b) => b.deliv_per - a.deliv_per).slice(0, 5),
    [marketData.stocks]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">Initializing Market Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">NSE <span className="text-orange-500">Bhavcopy</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              LATEST DATA: {marketData.date || 'N/A'}
            </div>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-full text-xs font-medium transition-all active:scale-95"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              {syncing ? (syncStatus || 'SYNCING...') : 'SYNC LATEST'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Top Gainers</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-3">
              {topGainers.map(stock => (
                <div key={stock.symbol} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stock.symbol}</span>
                  <span className="text-emerald-500 font-mono">+{(stock.price_change_per ?? 0).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">High Delivery</span>
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            <div className="space-y-3">
              {highDelivery.map(stock => (
                <div key={stock.symbol} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stock.symbol}</span>
                  <span className="text-blue-400 font-mono">{(stock.deliv_per ?? 0).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-center items-center text-center space-y-2">
            <BarChart3 className="w-8 h-8 text-orange-500 mb-2" />
            <h3 className="text-2xl font-light tracking-tight">Market Pulse</h3>
            <p className="text-zinc-500 text-xs max-w-[200px]">Analyzing {marketData.stocks.length} active NSE equity symbols</p>
          </div>
        </div>

        {/* Main Content Area */}
        {marketData.stocks.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-20 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center">
              <RefreshCw className={cn("w-10 h-10 text-orange-500", syncing && "animate-spin")} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">No Market Data Found</h2>
              <p className="text-zinc-500 max-w-md mx-auto">
                The database is currently empty. Click the button below to fetch the latest Bhavcopy from NSE archives. 
                This may take a few moments depending on your connection.
              </p>
            </div>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-full font-semibold transition-all active:scale-95 flex items-center gap-3"
            >
              <RefreshCw className={cn("w-5 h-5", syncing && "animate-spin")} />
              {syncing ? (syncStatus || 'SYNCING...') : 'SYNC NOW'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Table & Filters */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                  {(['all', 'gainers', 'losers', 'delivery'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                        filter === f ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Search symbol..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-zinc-900/80 text-zinc-500 font-mono text-[10px] uppercase tracking-widest border-b border-zinc-800">
                        <th className="px-6 py-4">Symbol</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Change</th>
                        <th className="px-6 py-4">Delivery</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredStocks.map((stock) => (
                        <tr 
                          key={stock.symbol} 
                          className={cn(
                            "hover:bg-zinc-800/30 transition-colors cursor-pointer group",
                            selectedStock === stock.symbol && "bg-orange-500/5"
                          )}
                          onClick={() => setSelectedStock(stock.symbol)}
                        >
                          <td className="px-6 py-4 font-semibold">{stock.symbol}</td>
                          <td className="px-6 py-4 font-mono">₹{formatNumber(stock.close)}</td>
                          <td className="px-6 py-4">
                            <div className={cn(
                              "flex items-center gap-1 font-mono text-xs",
                              stock.price_change_per > 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {stock.price_change_per > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {(Math.abs(stock.price_change_per ?? 0)).toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden max-w-[100px]">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  stock.deliv_per > 60 ? "bg-blue-500" : "bg-zinc-600"
                                )}
                                style={{ width: `${stock.deliv_per}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-zinc-500 mt-1 block font-mono">{(stock.deliv_per ?? 0).toFixed(1)}%</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-zinc-600 group-hover:text-orange-500 transition-colors">
                              <Activity className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Stock Detail & Charts */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sticky top-24">
                {selectedStock ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">{selectedStock}</h2>
                        <p className="text-zinc-500 text-xs font-mono">Historical Performance (Last 10 Sessions)</p>
                      </div>
                      <button onClick={() => setSelectedStock(null)} className="text-zinc-500 hover:text-white">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stockHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            hide 
                          />
                          <YAxis 
                            domain={['auto', 'auto']} 
                            orientation="right"
                            stroke="#52525b"
                            fontSize={10}
                            tickFormatter={(val) => `₹${val}`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                            itemStyle={{ color: '#f97316' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="close" 
                            stroke="#f97316" 
                            strokeWidth={2} 
                            dot={{ r: 4, fill: '#f97316' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-800/50 p-3 rounded-xl">
                        <span className="text-[10px] text-zinc-500 uppercase block mb-1">Avg. Delivery</span>
                        <span className="text-lg font-mono">
                          {(stockHistory.reduce((acc, curr) => acc + (curr.deliv_per ?? 0), 0) / (stockHistory.length || 1)).toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-zinc-800/50 p-3 rounded-xl">
                        <span className="text-[10px] text-zinc-500 uppercase block mb-1">Avg. Turnover</span>
                        <span className="text-lg font-mono">
                          ₹{formatNumber(stockHistory.reduce((acc, curr) => acc + (curr.turnover_lacs ?? 0), 0) / (stockHistory.length || 1))}L
                        </span>
                      </div>
                    </div>

                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stockHistory}>
                          <XAxis dataKey="date" hide />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          />
                          <Bar dataKey="deliv_per" radius={[4, 4, 0, 0]}>
                            {stockHistory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.deliv_per > 60 ? '#3b82f6' : '#3f3f46'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest mt-2">Delivery Volume Trend</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
                      <Search className="w-8 h-8 text-zinc-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">No Stock Selected</h3>
                      <p className="text-zinc-500 text-sm max-w-[200px]">Select a stock from the list to view detailed historical analytics.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-800/50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <Activity className="w-4 h-4" />
            <span>Data sourced from NSE India Archives</span>
          </div>
          <div className="flex gap-8 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            <span>SQLite Engine v3.0</span>
            <span>Market Hours: 09:15 - 15:30 IST</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
