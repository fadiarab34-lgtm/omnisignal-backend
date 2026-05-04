import { PortfolioUniverse } from "../../../../../components/portfolio-universe";

export default async function PortfolioUniversePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortfolioUniverse id={id} />;
}
