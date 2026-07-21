import type { Prisma } from "../../../app/generated/prisma/client";
import { currentUserId } from "../../../lib/access";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const snapshot = await prisma.workspaceSnapshot.findUnique({ where: { userId } });
  return Response.json({ state: snapshot?.state ?? null, updatedAt: snapshot?.updatedAt ?? null });
}

export async function PUT(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const body = await request.json().catch(() => null) as { state?: unknown } | null;
  if (!body?.state || typeof body.state !== "object" || Array.isArray(body.state)) {
    return Response.json({ error: "Ungültige Notizdaten." }, { status: 400 });
  }

  const snapshot = await prisma.workspaceSnapshot.upsert({
    where: { userId },
    create: { userId, state: body.state as Prisma.InputJsonValue },
    update: { state: body.state as Prisma.InputJsonValue },
    select: { updatedAt: true },
  });
  return Response.json({ ok: true, updatedAt: snapshot.updatedAt });
}
