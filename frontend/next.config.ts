import type { NextConfig } from "next";
import { apiUrl } from "./lib/api/url";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  env: {
    // Shown in the sidebar footer. Read from package.json so the two never drift.
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async rewrites() {
    // The browser calls the API on this app's own origin and Next.js forwards
    // the request, so the session cookie is first-party and proxy.ts can read
    // it. See docs/api-client.md.
    return [{ source: "/api/:path*", destination: `${apiUrl()}/api/:path*` }];
  },
};

export default nextConfig;
