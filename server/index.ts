import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const uri = process.env.MONGO_URI!;
const client = new MongoClient(uri);

await client.connect();
console.log("MongoDB connected");

const db = client.db("myapp");
const users = db.collection("users");

await users.createIndex({ email: 1 }, { unique: true });

Bun.serve({
  port: 3001,
  async fetch(req) {

    const url = new URL(req.url);

    // TEST
    if (req.method === "GET" && url.pathname === "/test") {

      const result = await users.insertOne({
        email: crypto.randomUUID() + "@test.com",
        createdAt: new Date()
      });

      return Response.json({
        ok: true,
        id: result.insertedId
      });
    }

    // REGISTER
    if (req.method === "POST" && url.pathname === "/auth/register") {

      const body = await req.json().catch(() => null) as null | {
        email?: string;
        password?: string;
      };

      const email = body?.email?.toLowerCase();
      const password = body?.password;

      if (!email || !password) {
        return Response.json({ error: "email och password krävs" }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      try {

        const result = await users.insertOne({
          email,
          passwordHash,
          createdAt: new Date()
        });

        return Response.json({
          ok: true,
          userId: result.insertedId
        });

      } catch (err) {

        return Response.json(
          { error: "email finns redan" },
          { status: 409 }
        );

      }

    }

    // LOGIN
    if (req.method === "POST" && url.pathname === "/auth/login") {

      const body = await req.json().catch(() => null) as null | {
        email?: string;
        password?: string;
      };

      const email = body?.email?.trim().toLowerCase();
      const password = body?.password;

      if (!email || !password) {
        return Response.json({ error: "email och password krävs" }, { status: 400 });
      }

      const user = await users.findOne({ email });
      if (!user) {
        return Response.json({ error: "fel inloggning" }, { status: 401 });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return Response.json({ error: "fel inloggning" }, { status: 401 });
      }

      const accessToken = jwt.sign(
        { sub: String(user._id), email: user.email },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: process.env.ACCESS_TTL || "15m" }
      );

      return Response.json({ ok: true, accessToken });
    }

    if (req.method === "GET" && url.pathname === "/me") {

      const auth = req.headers.get("authorization");

      if (!auth) {
        return Response.json({ error: "No token" }, { status: 401 });
      }

      const token = auth.split(" ")[1];

      try {

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);

        return Response.json({
          message: "You are authenticated",
          user: decoded
        });

      } catch {

        return Response.json({ error: "Invalid token" }, { status: 401 });

      }

    }

    return new Response("Server running");

  },
});

console.log("Server running on http://localhost:3001");