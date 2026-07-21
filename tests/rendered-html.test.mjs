import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("connects the Nexa login to the notes workspace", async () => {
  const [page, workspace, css] = await Promise.all([
    source("app/page.tsx"),
    source("components/notes/NotesWorkspace.tsx"),
    source("app/notebook.css"),
  ]);
  assert.match(page, /<NotesWorkspace user=\{user\}/);
  assert.match(workspace, /Notizbuch umbenennen/);
  assert.match(workspace, /Schnelle Notiz/);
  assert.match(workspace, /Wird gespeichert/);
  assert.match(workspace, /Papierkorb/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /theme-dark/);
});

test("provides a functional Tiptap editor and compact toolbar", async () => {
  const [editor, toolbar] = await Promise.all([
    source("components/notes/RichTextEditor.tsx"),
    source("components/notes/EditorToolbar.tsx"),
  ]);
  assert.match(editor, /StarterKit/);
  assert.match(editor, /TableKit/);
  assert.match(editor, /handleDrop/);
  assert.match(editor, /handlePaste/);
  assert.match(toolbar, /setFontFamily/);
  assert.match(toolbar, /setFontSize/);
  assert.match(toolbar, /toggleTaskList/);
  assert.match(toolbar, /insertTable/);
  assert.match(toolbar, /Weitere Werkzeuge/);
});

test("defines PostgreSQL models, Auth.js and server-side validation", async () => {
  const [schema, auth, validation, registration] = await Promise.all([
    source("prisma/schema.prisma"),
    source("auth.ts"),
    source("lib/validation.ts"),
    source("app/api/account/register/route.ts"),
  ]);
  for (const model of ["User", "Notebook", "NotebookMember", "Section", "NotePage", "QuickNote", "Comment", "Attachment", "NoteVersion"]) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /provider = "postgresql"/);
  assert.match(auth, /PrismaAdapter/);
  assert.match(auth, /Credentials/);
  assert.match(validation, /z\.object/);
  assert.match(registration, /bcrypt\.hash/);
});
