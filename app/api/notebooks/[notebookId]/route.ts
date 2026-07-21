import { currentUserId, notebookRole } from "../../../../lib/access";
import { prisma } from "../../../../lib/prisma";
import { notebookSchema } from "../../../../lib/validation";

type Context = { params: Promise<{ notebookId: string }> };

export async function PATCH(request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { notebookId } = await context.params;
  const role = await notebookRole(notebookId, userId);
  if (role !== "OWNER") return Response.json({ error: "Nur der Besitzer darf das Notizbuch ändern." }, { status: 403 });
  const parsed = notebookSchema.partial().safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const notebook = await prisma.notebook.update({ where: { id: notebookId }, data: parsed.data });
  return Response.json({ notebook });
}

export async function DELETE(_request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { notebookId } = await context.params;
  const role = await notebookRole(notebookId, userId);
  if (role !== "OWNER") return Response.json({ error: "Nur der Besitzer darf das Notizbuch löschen." }, { status: 403 });
  await prisma.notebook.update({ where: { id: notebookId }, data: { deletedAt: new Date() } });
  return Response.json({ ok: true });
}
