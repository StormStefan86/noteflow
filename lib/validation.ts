import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein.").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
});

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2, "Bitte gib deinen Namen ein.").max(80),
});

export const notebookSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#7567d8"),
});

export const notePageSchema = z.object({
  title: z.string().trim().min(1).max(240),
  content: z.json(),
  plainTextContent: z.string().max(2_000_000),
});

export const invitationSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  role: z.enum(["EDITOR", "COMMENTER", "VIEWER"]),
});
