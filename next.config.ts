import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["convex"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
