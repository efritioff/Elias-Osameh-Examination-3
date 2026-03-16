import { corsHeaders } from "./config.ts";
import { handleBooks } from "./routes/books.ts";
import { handleAuthors } from "./routes/authors.ts";
import { handleAuthRoutes } from "./routes/authRoutes.ts";

Bun.serve({
  port: 3001,
  async fetch(req) {

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);

    return (
      (await handleBooks(req, url)) ??
      (await handleAuthors(req, url)) ??
      (await handleAuthRoutes(req, url)) ??
      new Response("Server running", { headers: corsHeaders })
    );
  },
});

console.log("Server running on http://localhost:3001");