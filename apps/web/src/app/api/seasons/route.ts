import { json } from "@/server/api";
import { getRepository } from "@/server/repository";

export const GET = () => json(async () => ({ seasons: (await getRepository().listSeasons()).map((year) => ({ year })) }), "short");
