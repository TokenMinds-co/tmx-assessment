import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  env: {
    // Shown in the sidebar footer. Read from package.json so the two never drift.
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
