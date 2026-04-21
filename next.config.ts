import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActionsBodySizeLimit: '15mb',
  },
};

export default nextConfig;
