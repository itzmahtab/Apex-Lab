import { z } from "zod";
import { keySchema } from "@apexlab/contracts";
import { json } from "@/server/api";
import { AppError } from "@/server/errors";
import { getRepository } from "@/server/repository";

const q = z.object({ eventId: keySchema });

export const GET = (req: Request) => json(async () => {
  const p = q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!p.success) throw new AppError("VALIDATION_ERROR", "eventId is required");
  const c = await getRepository().getCatalog();
  if (!c.events.some((e) => e.key === p.data.eventId)) throw new AppError("NOT_FOUND", "Unknown event.");
  return { sessions: c.sessions.filter((s) => s.eventKey === p.data.eventId).map(({ key, name, sessionType }) => ({ key, name, sessionType })) };
});
