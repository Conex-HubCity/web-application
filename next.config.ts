import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: { serverFunctions: false },
  experimental: {
    agentFeedback: true,
    serverActions: { bodySizeLimit: "6mb" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
