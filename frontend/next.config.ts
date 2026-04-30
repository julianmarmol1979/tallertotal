import type { NextConfig } from "next";

// Increment this manually with each meaningful deploy
const APP_VERSION = "v1.48";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
};

export default nextConfig;
