import "server-only";
import { z } from "zod";

const schema = z
  .object({
    DATA_SOURCE: z.enum(["fixture", "db"]).default("fixture"),
    DATABASE_URL: z.string().optional(),
    FIXTURE_DIR: z.string().optional(),
    ARTIFACT_DIR: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  })
  .refine((e) => e.DATA_SOURCE !== "db" || !!e.DATABASE_URL, { message: "DATABASE_URL is required when DATA_SOURCE=db" });

let cached: z.infer<typeof schema> | undefined;
export function env() {
  return (cached ??= schema.parse(process.env));
}
