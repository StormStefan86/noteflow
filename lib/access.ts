import { auth } from "../auth";
import { prisma } from "./prisma";

export type AccessRole = "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER";

export async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function notebookRole(notebookId: string, userId: string): Promise<AccessRole | null> {
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, deletedAt: null },
    select: { ownerId: true, members: { where: { userId }, select: { role: true } } },
  });
  if (!notebook) return null;
  if (notebook.ownerId === userId) return "OWNER";
  return notebook.members[0]?.role ?? null;
}

export function canEdit(role: AccessRole | null) {
  return role === "OWNER" || role === "EDITOR";
}

export function canComment(role: AccessRole | null) {
  return role === "OWNER" || role === "EDITOR" || role === "COMMENTER";
}

export async function pageAccess(pageId: string, userId: string) {
  const page = await prisma.notePage.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { id: true, section: { select: { notebookId: true } } },
  });
  if (!page) return { page: null, role: null };
  return { page, role: await notebookRole(page.section.notebookId, userId) };
}
