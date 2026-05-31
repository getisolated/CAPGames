import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Filet de sécurité pour les server actions qui acceptent un body
      // (upload photo en fallback, logos équipes admin, etc.).
      // Vercel Hobby plafonne à 4.5 MB côté infra de toute façon.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
