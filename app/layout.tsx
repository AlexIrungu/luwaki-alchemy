import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import { CartProvider } from "@/lib/cart/CartProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HeaderBand } from "@/components/layout/HeaderBand";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { StorefrontOnly } from "@/components/layout/StorefrontOnly";
import "./globals.css";

// Applies a stored theme choice before first paint. Keep the key in step with
// THEME_KEY in components/layout/ThemeToggle.tsx.
const THEME_SCRIPT = `try{var t=localStorage.getItem("luwaki.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

// Placeholder type system — replace when Lucy supplies the brand fonts.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-cormorant",
});
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "LUWAKI ALCHEMY", template: "%s · LUWAKI ALCHEMY" },
  description: "3D-printed press-on nails, sculpted in translucent resin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <StorefrontOnly>
          <SmoothScroll />
        </StorefrontOnly>
        <CartProvider>
          <StorefrontOnly>
            <HeaderBand />
            <SiteHeader />
          </StorefrontOnly>
          <main>{children}</main>
          <StorefrontOnly>
            <SiteFooter />
          </StorefrontOnly>
        </CartProvider>
      </body>
    </html>
  );
}
