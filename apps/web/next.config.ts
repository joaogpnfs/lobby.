import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// The repo keeps one .env at the root; CI and production pass real env vars instead.
try {
  process.loadEnvFile("../../.env");
} catch {
  // no .env file: rely on the environment
}

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  // No cacheComponents/PPR: nonce-based CSP (src/proxy.ts) needs every page rendered per request.
  output: "standalone",
  // Monorepo: trace dependencies from the repo root so the standalone build is complete.
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Same origin for the browser: /api/v1/* is proxied to the API, so the refresh cookie stays first-party.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` }];
  },
  // CSP is set per request in src/proxy.ts (it carries a nonce).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
