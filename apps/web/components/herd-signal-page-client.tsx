"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type Signal = {
  id: string;
  sourceType: string;
  sourceName: string;
  ingestedAt: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  sentiment: string;
  urgencyScore: number;
  confidenceScore: number;
  marketImpactScore: number;
  geoRiskScore: number;
  crowdingScore?: number | null;
  divergenceScore?: number | null;
  affectedAssets: string[];
  affectedSectors: string[];
  suggestedAction: string;
  timeHorizon: string;
};

export function HerdSignalPageClient() {
  const social = useQuery({
    queryKey: ["herd-signal-social"],
    queryFn: () => apiFetch<{ signals: Signal[] }>("/signals/social"),
    refetchInterval: 60_000
  });
  const signals = social.data?.signals ?? [];

  return (
    <div className="herd-workspace">
      <aside className="herd-left">
        <h2><span />Crowd Sentiment</h2>
        <div className="herd-count">{signals.length} assets tracked</div>
        {social.isLoading && <p className="empty-terminal-line">Loading social velocity records.</p>}
        {social.isError && <p className="empty-terminal-line">{(social.error as Error).message}</p>}
        {!social.isLoading && !social.isError && signals.length === 0 && <p className="empty-terminal-line">No social velocity records yet. Configure a compliant social signal provider.</p>}
        {signals.slice(0, 10).map((signal) => (
          <div className="herd-meter-small" key={signal.id}>
            <div><b>{signal.affectedAssets[0] ?? signal.title}</b><span>{signal.category ?? signal.sourceName}</span><em>{score(primaryCrowd(signal))}%</em></div>
            <i><span style={{ width: `${score(primaryCrowd(signal))}%` }} /></i>
          </div>
        ))}
      </aside>
      <main className="herd-main">
        {signals.map((signal) => {
          const crowd = primaryCrowd(signal);
          return (
            <section className="herd-card" key={signal.id}>
              <div className="herd-card-head">
                <h2><span />{signal.affectedAssets[0] ?? signal.title}</h2>
                <div>
                  <b className={crowd >= 0.75 ? "urgent-tag" : "medium-tag"}>{crowd >= 0.75 ? "Extreme" : signal.sentiment}</b>
                  {signal.divergenceScore ? <b className="contrarian-tag">Contrarian</b> : null}
                </div>
              </div>
              <div className="herd-scale">
                <div><span>Bearish</span><span>Bullish</span></div>
                <i><span style={{ width: `${score(crowd)}%` }} /></i>
                <strong>{score(crowd)}%</strong>
              </div>
              <div className="herd-card-copy">
                <b>Crowd</b>
                <p>{signal.summary ?? "Signal stored without social summary."}</p>
              </div>
              <div className={signal.divergenceScore ? "herd-card-copy contrarian" : "herd-card-copy no-signal"}>
                <b>{signal.divergenceScore ? "Contrarian" : "No Signal Yet"}</b>
                <p>{signal.divergenceScore ? `Divergence score ${score(signal.divergenceScore)}%. Validate before acting.` : "No clean contrarian alert has been generated from this signal."}</p>
              </div>
              <div className="herd-actions">
                <span>{prettyAction(signal.suggestedAction)}</span>
                {signal.affectedAssets.slice(0, 4).map((asset) => <span key={asset}>{asset}</span>)}
              </div>
              <div className="herd-card-foot">
                <span>Timeframe: {signal.timeHorizon.replace("_", " ")}</span>
                <span>Source: {signal.sourceName}</span>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function primaryCrowd(signal: Signal) {
  return signal.crowdingScore ?? signal.confidenceScore ?? 0;
}

function score(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function prettyAction(action: string) {
  return action.replace(/_/g, " ");
}
