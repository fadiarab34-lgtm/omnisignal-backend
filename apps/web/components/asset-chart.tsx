"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function AssetChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || candles.length === 0) return;
    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: "#0b1017" }, textColor: "#8b949e" },
      grid: { horzLines: { color: "rgba(139,148,158,.12)" }, vertLines: { color: "rgba(139,148,158,.08)" } },
      rightPriceScale: { borderColor: "#21262d" },
      timeScale: { borderColor: "#21262d" },
      width: ref.current.clientWidth,
      height: ref.current.clientHeight
    });
    const series = chart.addCandlestickSeries({
      upColor: "#3fb950",
      downColor: "#f85149",
      wickUpColor: "#3fb950",
      wickDownColor: "#f85149",
      borderVisible: false
    });
    series.setData(candles.map((candle) => ({
      time: Math.floor(new Date(candle.timestamp).getTime() / 1000) as never,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    })));
    chart.timeScale().fitContent();
    const resize = () => chart.applyOptions({ width: ref.current?.clientWidth ?? 0, height: ref.current?.clientHeight ?? 260 });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, [candles]);

  if (candles.length === 0) {
    return <div className="state"><strong>No chart data</strong>Real candle data is unavailable for this asset and range.</div>;
  }
  return <div ref={ref} style={{ height: "100%", width: "100%" }} />;
}
