"use client";

import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code2,
  Eraser,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Paperclip,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const fonts = ["Arial", "Calibri", "Calibri Light", "Georgia", "Times New Roman", "Verdana", "Helvetica", "Courier New"];
const sizes = ["8", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "72"];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

type ToolbarProps = {
  editor: Editor;
  onAttachment: (file: File, url: string) => void;
  onError: (message: string) => void;
};

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`editor-tool${active ? " is-active" : ""}`}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Die Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

export function EditorToolbar({ editor, onAttachment, onError }: ToolbarProps) {
  const [, setRevision] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  async function insertImage(file: File) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      onError("Bitte verwende ein Bild im Format JPG, PNG, WebP oder GIF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      onError("Das Bild ist größer als 8 MB. Bitte wähle eine kleinere Datei.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", "image");
    const uploaded = await fetch("/api/uploads", { method: "POST", body: formData }).then(async (response) => response.ok ? response.json() as Promise<{ url: string }> : null).catch(() => null);
    const src = uploaded?.url ?? await fileAsDataUrl(file);
    editor.chain().focus().setImage({ src, alt: file.name, title: file.name }).run();
  }

  async function insertAttachment(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      onError("Der Anhang ist größer als 8 MB.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", "attachment");
    const uploaded = await fetch("/api/uploads", { method: "POST", body: formData }).then(async (response) => response.ok ? response.json() as Promise<{ url: string }> : null).catch(() => null);
    const url = uploaded?.url ?? await fileAsDataUrl(file);
    onAttachment(file, url);
    editor.chain().focus().insertContent(`<p><a href="${url}" download="${file.name}">📎 ${file.name}</a></p>`).run();
  }

  function insertLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link-Adresse eingeben", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  function insertImageUrl() {
    const src = window.prompt("Bild-URL eingeben", "https://");
    if (src?.trim()) editor.chain().focus().setImage({ src: src.trim(), alt: "Eingefügtes Bild" }).run();
  }

  function describeImage() {
    if (!editor.isActive("image")) { onError("Wähle zuerst ein Bild im Editor aus."); return; }
    const attributes = editor.getAttributes("image") as { alt?: string; title?: string };
    const alt = window.prompt("Alternativtext für Screenreader", attributes.alt ?? "") ?? attributes.alt;
    const title = window.prompt("Bildunterschrift", attributes.title ?? "") ?? attributes.title;
    editor.chain().focus().updateAttributes("image", { alt, title }).run();
  }

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Text formatieren">
      <div className="toolbar-scroll">
        <label className="toolbar-select-wrap" title="Schriftart">
          <span className="sr-only">Schriftart</span>
          <select
            aria-label="Schriftart"
            value={(editor.getAttributes("textStyle").fontFamily as string | undefined) ?? "Arial"}
            onChange={(event) => editor.chain().focus().setFontFamily(event.target.value).run()}
          >
            {fonts.map((font) => <option key={font} value={font}>{font}</option>)}
          </select>
        </label>
        <label className="toolbar-size-wrap" title="Schriftgröße">
          <span className="sr-only">Schriftgröße</span>
          <select
            aria-label="Schriftgröße"
            value={String(editor.getAttributes("textStyle").fontSize ?? "14px").replace("px", "")}
            onChange={(event) => editor.chain().focus().setFontSize(`${event.target.value}px`).run()}
          >
            {sizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>

        <span className="toolbar-divider" aria-hidden="true" />
        <ToolButton label="Fett (Strg+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></ToolButton>
        <ToolButton label="Kursiv (Strg+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></ToolButton>
        <ToolButton label="Unterstrichen (Strg+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={17} /></ToolButton>
        <ToolButton label="Durchgestrichen" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={17} /></ToolButton>
        <ToolButton label="Text hervorheben" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fff1a8" }).run()}><Highlighter size={17} /></ToolButton>
        <label className="color-tool" title="Schriftfarbe">
          <span className="color-letter">A</span>
          <input aria-label="Schriftfarbe" type="color" value={editor.getAttributes("textStyle").color ?? "#16243b"} onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} />
        </label>
        <ToolButton label="Formatierung löschen" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Eraser size={17} /></ToolButton>

        <span className="toolbar-divider" aria-hidden="true" />
        <ToolButton label="Aufzählung" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></ToolButton>
        <ToolButton label="Nummerierte Liste" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></ToolButton>
        <ToolButton label="Checkliste" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare size={17} /></ToolButton>
        <ToolButton label="Einzug verkleinern" disabled={!editor.can().liftListItem("listItem")} onClick={() => editor.chain().focus().liftListItem("listItem").run()}><IndentDecrease size={17} /></ToolButton>
        <ToolButton label="Einzug vergrößern" disabled={!editor.can().sinkListItem("listItem")} onClick={() => editor.chain().focus().sinkListItem("listItem").run()}><IndentIncrease size={17} /></ToolButton>

        <span className="toolbar-divider" aria-hidden="true" />
        <ToolButton label="Linksbündig" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={17} /></ToolButton>
        <ToolButton label="Zentriert" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={17} /></ToolButton>
        <ToolButton label="Rechtsbündig" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={17} /></ToolButton>
        <ToolButton label="Blocksatz" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify size={17} /></ToolButton>
        <label className="toolbar-style-wrap" title="Formatvorlage">
          <Pilcrow size={15} aria-hidden="true" />
          <select
            aria-label="Formatvorlage"
            value={editor.isActive("heading", { level: 1 }) ? "1" : editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : "0"}
            onChange={(event) => {
              const level = Number(event.target.value);
              if (level === 0) editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
            }}
          >
            <option value="0">Text</option><option value="1">Titel</option><option value="2">Überschrift</option><option value="3">Untertitel</option>
          </select>
        </label>

        <span className="toolbar-divider" aria-hidden="true" />
        <ToolButton label="Rückgängig (Strg+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></ToolButton>
        <ToolButton label="Wiederholen (Strg+Umschalt+Z)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></ToolButton>
        <ToolButton label="Link einfügen (Strg+K)" active={editor.isActive("link")} onClick={insertLink}><Link2 size={17} /></ToolButton>
        <ToolButton label="Tabelle einfügen" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={17} /></ToolButton>
        <ToolButton label="Bild hochladen" onClick={() => imageInput.current?.click()}><ImagePlus size={17} /></ToolButton>
        <input ref={imageInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void insertImage(file); event.target.value = ""; }} />

        <div className="toolbar-more-wrap">
          <ToolButton label="Weitere Werkzeuge" active={moreOpen} onClick={() => setMoreOpen((value) => !value)}><MoreHorizontal size={18} /></ToolButton>
          {moreOpen && (
            <div className="toolbar-more-menu">
              <button type="button" onClick={insertImageUrl}><ImagePlus size={16} /> Bild von URL</button>
              <button type="button" onClick={() => editor.chain().focus().updateAttributes("image", { width: "50%" }).run()} disabled={!editor.isActive("image")}>Bildbreite 50 %</button>
              <button type="button" onClick={() => editor.chain().focus().updateAttributes("image", { width: "75%" }).run()} disabled={!editor.isActive("image")}>Bildbreite 75 %</button>
              <button type="button" onClick={() => editor.chain().focus().updateAttributes("image", { width: "100%" }).run()} disabled={!editor.isActive("image")}>Bildbreite 100 %</button>
              <button type="button" onClick={() => editor.chain().focus().updateAttributes("image", { align: "left" }).run()} disabled={!editor.isActive("image")}>Bild links ausrichten</button>
              <button type="button" onClick={() => editor.chain().focus().updateAttributes("image", { align: "center" }).run()} disabled={!editor.isActive("image")}>Bild zentrieren</button>
              <button type="button" onClick={() => editor.chain().focus().updateAttributes("image", { align: "right" }).run()} disabled={!editor.isActive("image")}>Bild rechts ausrichten</button>
              <button type="button" onClick={describeImage} disabled={!editor.isActive("image")}>Alt-Text &amp; Bildunterschrift</button>
              <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} /> Horizontale Linie</button>
              <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={16} /> Codeblock</button>
              <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /> Zitat</button>
              <button type="button" onClick={() => fileInput.current?.click()}><Paperclip size={16} /> Datei anhängen</button>
            </div>
          )}
        </div>
        <input ref={fileInput} hidden type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void insertAttachment(file); event.target.value = ""; }} />
      </div>
    </div>
  );
}
