import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Item {
  symbol: string;
  name: string;
  price: number;
  change: number; // percent
  kind: "crypto" | "stock";
}

const STOCK_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM"];

const fmtPrice = (n: number) =>
  n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n.toFixed(n < 1 ? 4 : 2);

const MarketTicker = ({ variant = "dark" }: { variant?: "dark" | "light" }) => {
  const [items, setItems] = useState<Item[]>([]);

  const load = async () => {
    try {
      const cryptoRes = fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h"
      ).then((r) => r.json());

      const stockReqs = STOCK_SYMBOLS.map((s) =>
        fetch(`https://stooq.com/q/l/?s=${s}.us&f=sd2t2ohlcvn&h&e=json`)
          .then((r) => r.json())
          .then((d) => d?.symbols?.[0])
          .catch(() => null)
      );

      const [crypto, ...stocks] = await Promise.all([cryptoRes, ...stockReqs]);

      const cryptoItems: Item[] = (crypto || []).map((c: any) => ({
        symbol: (c.symbol || "").toUpperCase(),
        name: c.name,
        price: c.current_price,
        change: c.price_change_percentage_24h ?? 0,
        kind: "crypto",
      }));

      const stockItems: Item[] = stocks
        .filter(Boolean)
        .map((s: any) => {
          const close = parseFloat(s.close);
          const open = parseFloat(s.open);
          const change = open ? ((close - open) / open) * 100 : 0;
          return {
            symbol: (s.symbol || "").replace(".US", "").toUpperCase(),
            name: s.name || s.symbol,
            price: close,
            change,
            kind: "stock" as const,
          };
        })
        .filter((s) => Number.isFinite(s.price));

      const merged = [...cryptoItems, ...stockItems];
      if (merged.length) setItems(merged);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!items.length) {
    return (
      <div className={`w-full overflow-hidden border-y ${variant === "dark" ? "bg-card/60 border-border" : "bg-muted border-border"}`}>
        <div className="py-2 px-4 text-xs text-muted-foreground text-center">Loading market data…</div>
      </div>
    );
  }

  // duplicate for seamless marquee
  const loop = [...items, ...items];

  return (
    <div className={`w-full overflow-hidden border-y ${variant === "dark" ? "bg-card/70 border-border" : "bg-muted/40 border-border"}`}>
      <div className="relative flex">
        <div className="flex animate-marquee whitespace-nowrap py-2.5">
          {loop.map((it, i) => {
            const up = it.change >= 0;
            return (
              <div key={`${it.symbol}-${i}`} className="flex items-center gap-2 px-5 text-sm border-r border-border/40">
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${it.kind === "crypto" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"}`}>
                  {it.kind === "crypto" ? "CRYPTO" : "STOCK"}
                </span>
                <span className="font-semibold text-foreground">{it.symbol}</span>
                <span className="text-muted-foreground hidden sm:inline">{it.name}</span>
                <span className="font-medium tabular-nums">${fmtPrice(it.price)}</span>
                <span className={`flex items-center gap-0.5 tabular-nums text-xs ${up ? "text-success" : "text-destructive"}`}>
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {up ? "+" : ""}
                  {it.change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
        .animate-marquee:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
};

export default MarketTicker;
