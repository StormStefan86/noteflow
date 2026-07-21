import type { Prisma } from "../../../../app/generated/prisma/client";
import { canEdit, currentUserId, pageAccess } from "../../../../lib/access";
import { prisma } from "../../../../lib/prisma";
import { notePageSchema } from "../../../../lib/validation";

type Context = { params: Promise<{ pageId: string }> };

export async function PATCH(request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { pageId } = await context.params;
  const access = await pageAccess(pageId, userId);
  if (!access.page) return Response.json({ error: "Notiz nicht gefunden." }, { status: 404 });
  if (!canEdit(access.role)) return Response.json({ error: "Keine Bearbeitungsberechtigung." }, { status: 403 });
  const parsed = notePageSchema.partial().safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const previous = await prisma.notePage.findUniqueOrThrow({ where: { id: pageId }, select: { title: true, content: true, updatedAt: true } });
  const shouldVersion = Date.now() - previous.updatedAt.getTime() > 5 * 60_000;
  const page = await prisma.$transaction(async (tx) => {
    if (shouldVersion) await tx.noteVersion.create({ data: { notePageId: pageId, title: previous.title, content: previous.content as Prisma.InputJsonValue, createdById: userId } });
    return tx.notePage.update({
      where: { id: pageId },
      data: {
        ...parsed.data,
        content: parsed.data.content as Prisma.InputJsonValue | undefined,
        updatedById: userId,
      },
    });
  });
  return Response.json({ page });
}

export async function DELETE(_request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { pageId } = await context.params;
  const access = await pageAccess(pageId, userId);
  if (!canEdit(access.role)) return Response.json({ error: "Keine Bearbeitungsberechtigung." }, { status: 403 });
  await prisma.notePage.update({ where: { id: pageId }, data: { deletedAt: new Date(), updatedById: userId } });
  return Response.json({ ok: true });
}
