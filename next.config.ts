import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the Docker image stays small and
  // Railway can boot it without a full node_modules tree. Vercel builds its own
  // output format and advises against setting this, so leave it off there.
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
