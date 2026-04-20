import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { UserDoc } from "@/lib/types/user";
import { hashPassword } from "@/lib/auth/password";

const COL = "users";

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  const doc = await db
    .collection<UserDoc>(COL)
    .findOne({ email: email.toLowerCase().trim() });
  return doc;
}

export async function createUser(params: {
  email: string;
  name: string;
  password: string;
}): Promise<UserDoc> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  const email = params.email.toLowerCase().trim();
  const existing = await db.collection(COL).findOne({ email });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }
  const passwordHash = await hashPassword(params.password);
  const now = new Date();
  const insert = await db.collection<UserDoc>(COL).insertOne({
    email,
    name: params.name.trim().slice(0, 80),
    passwordHash,
    createdAt: now,
  } as Omit<UserDoc, "_id">);
  const created = await db.collection<UserDoc>(COL).findOne({ _id: insert.insertedId });
  if (!created) throw new Error("Failed to create user.");
  return created;
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  if (!ObjectId.isValid(id)) return null;
  return db.collection<UserDoc>(COL).findOne({ _id: new ObjectId(id) });
}
