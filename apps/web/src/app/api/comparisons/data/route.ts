import { json } from "@/server/api";
import { buildComparison } from "@/server/comparison";

export const GET = (req: Request) => json(() => buildComparison(Object.fromEntries(new URL(req.url).searchParams)));
