import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/acefighter',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
