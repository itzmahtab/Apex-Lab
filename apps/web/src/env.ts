import "server-only";
import { z } from "zod";

const schema = z
  .object({
    DATA_SOURCE: z.enum(["openf1", "fixture"]).default("openf1"),
    DATABASE_URL: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
    /** Base URL of a self-hosted julesr0y/f1-livetiming-api instance, for the /live dashboard. Optional. */
    LIVETIMING_API_URL: z.string().url().optional(),
  })
  ;

let cached: z.infer<typeof schema> | undefined;
export function env() {
  return (cached ??= schema.parse(process.env));
}
