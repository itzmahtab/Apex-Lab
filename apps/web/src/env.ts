import "server-only";
import { z } from "zod";

const schema = z
  .object({
    DATA_SOURCE: z.enum(["openf1", "fixture"]).default("openf1"),
    DATABASE_URL: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  })
  ;

let cached: z.infer<typeof schema> | undefined;
export function env() {
  return (cached ??= schema.parse(process.env));
}
