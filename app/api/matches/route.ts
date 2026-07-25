import { env } from "cloudflare:workers";
import {
  isEditPasswordValid,
  validateMatches,
  type MatchState,
} from "../../../lib/matches";

export const dynamic = "force-dynamic";

type RuntimeEnv = {
  DB: D1Database;
  EDIT_PASSWORD?: string;
};

const createTableSql = `CREATE TABLE IF NOT EXISTS match_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL DEFAULT '[]',
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
)`;

async function ensureState(db: D1Database) {
  await db.batch([
    db.prepare(createTableSql),
    db.prepare("INSERT OR IGNORE INTO match_state (id, data, revision) VALUES (1, '[]', 0)"),
  ]);
}

async function readState(db: D1Database): Promise<MatchState> {
  await ensureState(db);
  const row = await db
    .prepare("SELECT data, revision, updated_at AS updatedAt FROM match_state WHERE id = 1")
    .first<{ data: string; revision: number; updatedAt: string | null }>();

  return {
    matches: validateMatches(JSON.parse(row?.data ?? "[]")),
    revision: row?.revision ?? 0,
    updatedAt: row?.updatedAt ?? null,
  };
}

function database() {
  const db = (env as RuntimeEnv).DB;
  if (!db) throw new Error("D1 veritabanı bağlı değil.");
  return db;
}

export async function GET() {
  try {
    const state = await readState(database());
    return Response.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to read matches", error);
    return Response.json(
      { error: "Maçlar şu anda yüklenemedi." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PUT(request: Request) {
  const runtime = env as RuntimeEnv;
  const password = request.headers.get("x-edit-password");
  const expected = runtime.EDIT_PASSWORD ?? "53";

  if (!(await isEditPasswordValid(password, expected))) {
    return Response.json({ error: "Düzenleme parolası geçersiz." }, { status: 401 });
  }

  let input: { matches?: unknown; revision?: unknown };
  try {
    input = await request.json() as typeof input;
  } catch {
    return Response.json({ error: "Gönderilen veri okunamadı." }, { status: 400 });
  }

  try {
    const matches = validateMatches(input.matches);
    if (!Number.isInteger(input.revision) || (input.revision as number) < 0) {
      return Response.json({ error: "Kayıt sürümü geçersiz." }, { status: 400 });
    }

    const db = database();
    await ensureState(db);
    const updatedAt = new Date().toISOString();
    const result = await db
      .prepare(
        "UPDATE match_state SET data = ?, revision = revision + 1, updated_at = ? WHERE id = 1 AND revision = ?",
      )
      .bind(JSON.stringify(matches), updatedAt, input.revision)
      .run();

    if (result.meta.changes !== 1) {
      return Response.json(
        { error: "Bu liste başka biri tarafından güncellendi. Son hâlini yükleyip tekrar dene." },
        { status: 409 },
      );
    }

    return Response.json({
      matches,
      revision: (input.revision as number) + 1,
      updatedAt,
    } satisfies MatchState);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Değişiklikler kaydedilemedi.";
    const status = message.includes("veritabanı") ? 500 : 400;
    if (status === 500) console.error("Unable to save matches", error);
    return Response.json({ error: message }, { status });
  }
}
