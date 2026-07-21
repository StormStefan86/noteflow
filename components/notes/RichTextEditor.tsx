"use client";

import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import type { Attachment } from "../../types/notes";
import { EditorToolbar } from "./EditorToolbar";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const EnhancedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: "100%", renderHTML: (attributes) => ({ width: attributes.width }) },
      align: { default: "center", renderHTML: (attributes) => ({ "data-align": attributes.align }) },
    };
  },
});

function readImage(file: File, onReady: (src: string) => void, onError: (message: string) => void) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    onError("Unterstützt werden JPG, PNG, WebP und GIF.");
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    onError("Das Bild darf höchstens 8 MB groß sein.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onReady(String(reader.result));
  reader.onerror = () => onError("Das Bild konnte nicht gelesen werden.");
  reader.readAsDataURL(file);
}

type RichTextEditorProps = {
  content: string;
  editable: boolean;
  onChange: (html: string, plainText: string) => void;
  onAttachment: (attachment: Attachment) => void;
  onError: (message: string) => void;
};

export function RichTextEditor({ content, editable, onChange, onAttachment, onError }: RichTextEditorProps) {
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    content,
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyleKit,
      Link.configure({ openOnClick: false, autolink: true }),
      EnhancedImage.configure({ allowBase64: true, inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    editorProps: {
      attributes: {
        class: "note-editor-content",
        "aria-label": "Notizinhalt",
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file?.type.startsWith("image/")) return false;
        event.preventDefault();
        readImage(file, (src) => editorRef.current?.chain().focus().setImage({ src, alt: file.name }).run(), onError);
        return true;
      },
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
        if (!file) return false;
        event.preventDefault();
        readImage(file, (src) => editorRef.current?.chain().focus().setImage({ src, alt: file.name }).run(), onError);
        return true;
      },
    },
    onCreate: ({ editor: createdEditor }) => {
      editorRef.current = createdEditor;
    },
    onUpdate: ({ editor: updatedEditor }) => onChange(updatedEditor.getHTML(), updatedEditor.getText()),
  });

  useEffect(() => {
    if (!editor) return;
    editorRef.current = editor;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor || editor.getHTML() === content) return;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  useEffect(() => {
    if (!editor || !editable) return;
    const handleLinkShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k" || !editor.view.hasFocus()) return;
      event.preventDefault();
      const href = window.prompt("Link-Adresse eingeben", editor.getAttributes("link").href ?? "https://");
      if (href?.trim()) editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
    };
    window.addEventListener("keydown", handleLinkShortcut);
    return () => window.removeEventListener("keydown", handleLinkShortcut);
  }, [editable, editor]);

  if (!editor) return <div className="editor-loading" role="status">Editor wird geladen …</div>;

  return (
    <div className="rich-editor-shell">
      {editable && (
        <EditorToolbar
          editor={editor}
          onError={onError}
          onAttachment={(file, url) => onAttachment({
            id: crypto.randomUUID(),
            filename: file.name,
            url,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            createdAt: new Date().toISOString(),
          })}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
