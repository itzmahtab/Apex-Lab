import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@apexlab/contracts", "@apexlab/analytics", "@apexlab/db"],
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
  turbopack: { root: new URL("../..", import.meta.url).pathname },
};
export default config;
