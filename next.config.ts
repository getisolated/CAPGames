import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome pour Docker : .next/standalone contient server.js + node_modules minimal.
  output: "standalone",
  experimental: {
    serverActions: {
      // Server actions qui acceptent un body (upload photo en fallback,
      // logos équipes, images quizz/sondages). Caddy ne limite pas le body.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
