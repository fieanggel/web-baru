import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow common local hosts used during development so hydration assets are not blocked.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "192.168.56.1",
    "192.168.1.9",
  ],
};

export default nextConfig;
