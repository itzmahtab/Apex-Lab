import { keySchema } from "@apexlab/contracts";
import { json } from "@/server/api";
import { AppError } from "@/server/errors";
import { getRepository } from "@/server/repository";

export const GET = (_: Request, ctx: { params: Promise<{ sessionKey: string }> }) => json(async () => {
  const k = keySchema.safeParse((await ctx.params).sessionKey);
  if (!k.success) throw new AppError("VALIDATION_ERROR", "Invalid session key");
  const s = (await getRepository().getCatalog()).sessions.find((x) => x.key === k.data);
  if (!s) throw new AppError("NOT_FOUND", "Unknown session.");
  return { drivers: s.drivers, laps: s.laps };
});
