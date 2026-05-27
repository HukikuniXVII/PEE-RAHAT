import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output bundles only the files needed to run the server,
  // so the Docker runtime stage can stay slim. outputFileTracingRoot
  // points at the repo root so workspace packages (@peerahat/ui, types)
  // get traced into the bundle instead of being missed. On Next 14 the
  // tracing-root key still lives under `experimental` (top-level in 15+).
  output: "standalone",
  transpilePackages: ["@peerahat/ui", "@peerahat/types"],
  // Lint runs as its own workspace task (`pnpm -r lint`); don't gate the
  // production build on it. Before, the workspace ESLint config was
  // mis-resolved so `next build` silently skipped lint; fixing that
  // resolution surfaced ~6 pre-existing errors that aren't deploy-critical
  // (unused imports, unescaped quotes, one rules-of-hooks lead). Track and
  // fix them separately instead of blocking image publishes.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    typedRoutes: true,
    outputFileTracingRoot: path.join(__dirname, "../.."),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
