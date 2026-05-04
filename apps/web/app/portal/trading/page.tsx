import { Suspense } from "react";
import { TradingPageClient } from "../../../components/trading-page-client";

export default function TradingPage() {
  return (
    <Suspense fallback={<div className="panel"><div className="state"><strong>Loading trading</strong></div></div>}>
      <TradingPageClient />
    </Suspense>
  );
}
