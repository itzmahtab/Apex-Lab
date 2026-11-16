import { json } from "@/server/api";
import { getRepository } from "@/server/repository";

export const GET = () => json(async () => ({ seasons: (await getRepository().getCatalog()).seasons.map((s) => ({ year: s.year })) }));
