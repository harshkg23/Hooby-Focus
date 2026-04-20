import { createHash } from "crypto";
import { getDb } from "@/lib/mongodb";

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function keyHash(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export async function getCachedJson<T>(namespace: string, parts: string[]): Promise<T | null> {
  const db = await getDb();
  if (!db) return null;
  const key = `${namespace}:${keyHash(parts)}`;
  const doc = await db.collection("cache").findOne<{ value: T; expiresAt: Date }>({ key });
  if (!doc) return null;
  if (doc.expiresAt < new Date()) return null;
  return doc.value;
}

export async function setCachedJson<T>(namespace: string, parts: string[], value: T): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const key = `${namespace}:${keyHash(parts)}`;
  await db.collection("cache").updateOne(
    { key },
    {
      $set: {
        key,
        value,
        expiresAt: new Date(Date.now() + TTL_MS),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}
