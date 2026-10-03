import { Header, Footer } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { Engine, Participate } from "@/components/sections";
import { ChaosLore } from "@/components/chaos-lore";
import { MarketDataPanel } from "@/components/market-data-panel";
import { FinancialStatusPanel } from "@/components/financial-status-panel";

export default function Home() {
  return <><a className="skip-link" href="#main">Skip to content</a><Header />
    <main id="main"><Hero /><ChaosLore /><Engine /><FinancialStatusPanel /><MarketDataPanel /><Participate /></main>
    <Footer /></>;
}
