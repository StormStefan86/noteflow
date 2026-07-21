import { currentUserId } from "../../../lib/access";
import { prisma } from "../../../lib/prisma";
import { notebookSchema } from "../../../lib/validation";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const notebooks = await prisma.notebook.findMany({
    where: { deletedAt: null, OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      sections: { where: { deletedAt: null }, orderBy: { position: "asc" }, include: { pages: { where: { deletedAt: null }, orderBy: { position: "asc" } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json({ notebooks });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  const parsed = notebookSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const notebook = await prisma.notebook.create({
    data: {
      ...parsed.data,
      ownerId: userId,
      members: { create: { userId, invitedBy: userId, role: "OWNER" } },
      sections: { create: { name: "Allgemein", color: parsed.data.color, position: 0 } },
    },
    include: { sections: true, members: true },
  });
  return Response.json({ notebook }, { status: 201 });
}
