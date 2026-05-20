import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@md2pdf/renderer"],
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "playwright"],
  turbopack: {
    root: path.resolve(__dirname, "../..")
  },
  outputFileTracingRoot: path.resolve(__dirname, "../..")
};

export default nextConfig;
