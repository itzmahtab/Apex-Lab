import { z } from "zod";
import { json } from "@/server/api";
import { AppError } from "@/server/errors";
import { getRepository } from "@/server/repository";

const q = z.object({ season: z.coerce.number().int().min(1950).max(2200) });

export const GET = (req: Request) => json(async () => {
  const p = q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!p.success) throw new AppError("VALIDATION_ERROR", "season must be a year");
  return { events: await getRepository().listEvents(p.data.season) };
}, "short");
