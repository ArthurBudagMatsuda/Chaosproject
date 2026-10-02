import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHAOS — The system is unstable",
  description: "An experimental memecoin concept inspired by chaos theory and the butterfly effect. Explore the frontend simulation. Chaos Engine is coming soon.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
