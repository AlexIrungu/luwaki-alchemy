import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product imagery lives in Supabase Storage. Add the project ref host once
    // the Supabase project exists.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    // Phase 3 serves Draco GLBs from /public/models — same caching as the demo.
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/draco/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
