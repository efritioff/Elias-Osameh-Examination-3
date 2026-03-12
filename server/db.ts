import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI!;
const client = new MongoClient(uri);

await client.connect();
console.log("MongoDB connected");

const db = client.db("myapp");

export const users = db.collection("users");
export const books = db.collection("books");
export const authors = db.collection("authors");
export const refreshTokens = db.collection("refreshTokens");

await users.createIndex({ email: 1 }, { unique: true });
await authors.createIndex({ name: 1 });
await refreshTokens.createIndex({ userId: 1 }, { unique: true });
await refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });