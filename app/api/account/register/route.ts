import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { registerSchema } from "../../../../lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return Response.json({ error: "Für diese E-Mail-Adresse besteht bereits ein Konto." }, { status: 409 });

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        ownedNotebooks: {
          create: {
            name: "Mein erstes Notizbuch",
            description: "Dein persönlicher Bereich für Gedanken, Aufgaben und Ideen.",
            color: "#7567d8",
            sections: {
              create: [
                { name: "Allgemein", color: "#7567d8", position: 0 },
                { name: "Aufgaben", color: "#4eb7b6", position: 1 },
                { name: "Ideen", color: "#ef9e66", position: 2 },
              ],
            },
          },
        },
      },
      select: { id: true, name: true, email: true, image: true },
    });
    return Response.json({ user }, { status: 201 });
  } catch {
    return Response.json({ error: "Das Konto konnte momentan nicht angelegt werden." }, { status: 500 });
  }
}
