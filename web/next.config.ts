import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "delvo.gonzaloromerobernal.es",
    "*.gonzaloromerobernal.es",
  ],
};

export default nextConfig;
