import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CHAOS — The system is unstable",
  description: "A Solana market observatory inspired by chaos theory and the butterfly effect, with read-only monitoring and verified financial records.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
