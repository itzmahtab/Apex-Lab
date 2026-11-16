import { json } from "@/server/api";
import { loadSession } from "@/server/comparison";

export const GET = (_: Request, ctx: { params: Promise<{ sessionKey: string }> }) => json(async () => {
  const s = await loadSession((await ctx.params).sessionKey);
  return { session: s.session, drivers: s.drivers, laps: s.laps };
});
