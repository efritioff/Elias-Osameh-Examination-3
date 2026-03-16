import type { SignOptions } from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env");
}

export const ACCESS_SECRET: string = accessSecret;
export const REFRESH_SECRET: string = refreshSecret;

export const accessTtl = (process.env.ACCESS_TTL || "15m") as SignOptions["expiresIn"];
export const refreshTtl = (process.env.REFRESH_TTL || "7d") as SignOptions["expiresIn"];

export const isProd = process.env.NODE_ENV === "production";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};