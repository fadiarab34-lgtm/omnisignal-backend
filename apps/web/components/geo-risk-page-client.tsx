"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type Signal = {
  id: string;
  sourceType: string;
  sourceName: string;
  publishedAt?: string | null;
  ingestedAt: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  sentiment: string;
  urgencyScore: number;
  confidenceScore: number;
  marketImpactScore: number;
  geoRiskScore: number;
  affectedAssets: string[];
  affectedSectors: string[];
  suggestedAction: string;
};

export function GeoRiskPageClient() {
  const geo = useQuery({
    queryKey: ["geo-risk-signals"],
    queryFn: () => apiFetch<{ signals: Signal[] }>("/signals/geo"),
    refetchInterval: 60_000
  });
  const signals = geo.data?.signals ?? [];

  return (
    <div className="risk-workspace">
      <aside className="risk-left">
        <h2><span />Active Risk Zones</h2>
        {geo.isLoading && <p className="empty-terminal-line">Loading geopolitical risk signals.</p>}
        {geo.isError && <p className="empty-terminal-line">{(geo.error as Error).message}</p>}
        {!geo.isLoading && !geo.isError && signals.length === 0 && <p className="empty-terminal-line">No geopolitical risk records yet. Configure news and ingestion providers.</p>}
        {signals.slice(0, 12).map((signal) => (
          <a href={`#geo-${signal.id}`} key={signal.id} className="risk-zone-link">
            <b>{initials(signal.title)}</b>
            <span>{signal.title}</span>
            <em className={signal.geoRiskScore >= 0.75 ? "critical" : signal.geoRiskScore >= 0.5 ? "high" : "watch"}>{riskLabel(signal.geoRiskScore)}</em>
            <small>{signal.affectedAssets.slice(0, 3).join(" · ") || "No mapped assets"}</small>
          </a>
        ))}
      </aside>
      <main className="risk-main">
        {signals.map((signal) => (
          <section id={`geo-${signal.id}`} className={`risk-card ${signal.geoRiskScore >= 0.75 ? "critical" : signal.geoRiskScore >= 0.5 ? "high" : "watch"}`} key={signal.id}>
            <div className="risk-card-head">
              <div>
                <h1>{signal.title}</h1>
                <p>Flagged: {formatDate(signal.publishedAt ?? signal.ingestedAt)}</p>
              </div>
              <span>{riskLabel(signal.geoRiskScore)}</span>
            </div>
            <div className="risk-why">
              <b>Why {riskLabel(signal.geoRiskScore).toLowerCase()}</b>
              <p>{signal.summary ?? "Signal stored without AI summary."}</p>
            </div>
            <div className="risk-triggers">
              <b>Triggers</b>
              <ul>
                <li>Source: {signal.sourceName}</li>
                <li>Category: {signal.category ?? "uncategorized"}</li>
                <li>Market impact score: {score(signal.marketImpactScore)}%</li>
                <li>Confidence score: {score(signal.confidenceScore)}%</li>
              </ul>
            </div>
            <div className="risk-industries">
              <b>Impacted industries</b>
              {(signal.affectedSectors.length ? signal.affectedSectors : ["Unmapped sector"]).map((sector) => (
                <div className="risk-industry-row" key={sector}>
                  <div><strong>{sector}</strong><p>{signal.affectedAssets.slice(0, 6).join(", ") || "No assets mapped yet."}</p></div>
                  <em>{score(signal.marketImpactScore)}%</em>
                  <span>{prettyAction(signal.suggestedAction)}</span>
                </div>
              ))}
            </div>
            <div className="risk-tags">
              {signal.affectedAssets.slice(0, 8).map((asset) => <span key={asset}>{asset}</span>)}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function riskLabel(value: number) {
  if (value >= 0.75) return "Critical";
  if (value >= 0.5) return "High";
  return "Watch";
}

function score(value: number) {
  return Math.round(value * 100);
}

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "G";
}

function prettyAction(action: string) {
  return action.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
