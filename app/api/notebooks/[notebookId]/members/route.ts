import { currentUserId, notebookRole } from "../../../../../lib/access";
import { prisma } from "../../../../../lib/prisma";
import { invitationSchema } from "../../../../../lib/validation";

type Context = { params: Promise<{ notebookId: string }> };

export async function POST(request: Request, context: Context) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { notebookId } = await context.params;
  if ((await notebookRole(notebookId, userId)) !== "OWNER") return Response.json({ error: "Nur der Besitzer darf Personen einladen." }, { status: 403 });
  const parsed = invitationSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const invitedUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!invitedUser) return Response.json({ error: "Für diese E-Mail-Adresse wurde noch kein Konto gefunden." }, { status: 404 });
  const member = await prisma.notebookMember.upsert({
    where: { notebookId_userId: { notebookId, userId: invitedUser.id } },
    update: { role: parsed.data.role, invitedBy: userId },
    create: { notebookId, userId: invitedUser.id, role: parsed.data.role, invitedBy: userId },
  });
  return Response.json({ member }, { status: 201 });
}
