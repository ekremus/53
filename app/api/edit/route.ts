import { env } from "cloudflare:workers";
import { isEditPasswordValid } from "../../../lib/matches";

export const dynamic = "force-dynamic";

type RuntimeEnv = { EDIT_PASSWORD?: string };

export async function POST(request: Request) {
  let password: unknown;
  try {
    password = (await request.json() as { password?: unknown }).password;
  } catch {
    return Response.json({ error: "Parola gerekli." }, { status: 400 });
  }

  const expected = (env as RuntimeEnv).EDIT_PASSWORD ?? "53";
  const valid = await isEditPasswordValid(password, expected);

  return Response.json(
    valid ? { ok: true } : { error: "Parola yanlış." },
    {
      status: valid ? 200 : 401,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
