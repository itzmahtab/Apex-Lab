import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@apexlab/contracts", "@apexlab/analytics", "@apexlab/db"],
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
  // @ts-expect-error -- Next 16.4 option; prevents `next dev` writing AGENTS.md into the repo
  agentRules: false,
  turbopack: { root: new URL("../..", import.meta.url).pathname },
};
export default config;
