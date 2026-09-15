"use client";

import { usePathname } from "next/navigation";

/**
 * Renders the storefront chrome (header, footer, smooth scroll) everywhere
 * except /admin, which has its own shell. Server components pass through as
 * children, so the header and footer stay server-rendered.
 */
export function StorefrontOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? null : children;
}
