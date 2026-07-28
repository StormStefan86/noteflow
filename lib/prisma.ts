import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const configuredConnectionString = process.env.DATABASE_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? process.env.POSTGRES_URL
    ?? "postgresql://postgres:postgres@localhost:5432/nexa_notes";
  const connectionUrl = new URL(configuredConnectionString);

  // Supabase's pooler uses TLS. pg 8.22 verifies `sslmode=require`
  // certificates unless libpq compatibility is enabled, which rejects
  // Supabase's managed certificate chain in Vercel's runtime.
  if (
    connectionUrl.searchParams.get("sslmode") === "require"
    && !connectionUrl.searchParams.has("uselibpqcompat")
  ) {
    connectionUrl.searchParams.set("uselibpqcompat", "true");
  }

  const connectionString = connectionUrl.toString();
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
