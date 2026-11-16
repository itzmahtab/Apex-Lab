import { defineConfig } from "vitest/config";

// Unit tests only. Browser tests in e2e/ are run by Playwright (`pnpm e2e`), never by Vitest.
export default defineConfig({ test: { include: ["src/**/*.test.ts"], passWithNoTests: true } });
