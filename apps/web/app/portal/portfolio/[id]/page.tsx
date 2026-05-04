import { PortfolioDetail } from "../../../../components/portfolio-detail";

export default async function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortfolioDetail id={id} />;
}
