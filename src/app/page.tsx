import { chaosDataSource } from "@/lib/chaos-data";
import { Header, Footer } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { Engine, Participate } from "@/components/sections";
import { ChaosLore } from "@/components/chaos-lore";
import { MarketDataPanel } from "@/components/market-data-panel";

export default async function Home() {
  const data = await chaosDataSource.getSnapshot();
  return <><a className="skip-link" href="#main">Skip to content</a><Header />
    <main id="main"><Hero initialIndex={data.chaosIndex} pool={data.pool.map(token => token.symbol)} /><ChaosLore /><Engine /><MarketDataPanel /><Participate /></main>
    <Footer /></>;
}
