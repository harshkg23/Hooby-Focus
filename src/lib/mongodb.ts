import { MongoClient } from "mongodb";
import { getMongoUrl } from "@/lib/env";

let client: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = getMongoUrl();
  if (!uri) return null;
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

export async function getDb() {
  const c = await getMongoClient();
  if (!c) return null;
  return c.db("hobby_focus");
}
