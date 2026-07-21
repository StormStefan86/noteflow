import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/nexa_notes" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("NexaDemo2026!", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@nexa-notes.local" },
    update: {},
    create: { name: "Nexa Demo", email: "demo@nexa-notes.local", passwordHash },
  });

  const existing = await prisma.notebook.findFirst({ where: { ownerId: user.id, name: "Mein erstes Notizbuch" } });
  if (existing) return;

  await prisma.notebook.create({
    data: {
      name: "Mein erstes Notizbuch",
      description: "Beispieldaten für die lokale Entwicklung.",
      color: "#7567d8",
      ownerId: user.id,
      members: { create: { userId: user.id, invitedBy: user.id, role: "OWNER" } },
      sections: {
        create: [
          { name: "Allgemein", color: "#7567d8", position: 0 },
          { name: "Aufgaben", color: "#4eb7b6", position: 1 },
          { name: "Ideen", color: "#ef9e66", position: 2 },
        ],
      },
    },
  });
}

main().finally(() => prisma.$disconnect());
