import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@md2pdf/core", "@md2pdf/db", "@md2pdf/renderer"],
  turbopack: {
    root: path.resolve(__dirname, "../..")
  },
  outputFileTracingRoot: path.resolve(__dirname, "../..")
};

export default nextConfig;
