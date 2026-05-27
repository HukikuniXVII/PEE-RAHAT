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
