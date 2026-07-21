"use client";

import { Check, Clock3, History, MessageSquare, RotateCcw, Send, X } from "lucide-react";
import { useState } from "react";
import type { NoteComment, NotePage, NoteVersion, WorkspaceUser } from "../../types/notes";

type SidePanelProps = {
  mode: "comments" | "versions" | null;
  page: NotePage;
  currentUser: WorkspaceUser;
  onClose: () => void;
  onAddComment: (comment: NoteComment) => void;
  onToggleComment: (commentId: string) => void;
  onRestoreVersion: (version: NoteVersion) => void;
};

export function NoteSidePanel({ mode, page, currentUser, onClose, onAddComment, onToggleComment, onRestoreVersion }: SidePanelProps) {
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>();
  if (!mode) return null;

  return (
    <aside className="note-side-panel" aria-label={mode === "comments" ? "Kommentare" : "Versionsverlauf"}>
      <header>
        <div>{mode === "comments" ? <MessageSquare size={18} /> : <History size={18} />}<h3>{mode === "comments" ? "Kommentare" : "Versionsverlauf"}</h3></div>
        <button type="button" onClick={onClose} aria-label="Seitenleiste schließen"><X size={18} /></button>
      </header>

      {mode === "comments" ? (
        <>
          <div className="comments-list">
            {page.comments.length === 0 && <div className="panel-empty"><MessageSquare size={25} /><p>Noch keine Kommentare.</p></div>}
            {page.comments.map((item) => (
              <article key={item.id} className={`${item.status === "RESOLVED" ? "is-resolved" : ""}${item.parentCommentId ? " is-reply" : ""}`}>
                <div className="comment-author"><span>{item.author.name.slice(0, 2).toUpperCase()}</span><div><strong>{item.author.name}</strong><small>{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</small></div></div>
                <p>{item.content}</p>
                <div className="comment-actions"><button type="button" onClick={() => setReplyTo(item.id)}>Antworten</button><button type="button" onClick={() => onToggleComment(item.id)}>{item.status === "OPEN" ? <><Check size={14} /> Erledigen</> : <><RotateCcw size={14} /> Wieder öffnen</>}</button></div>
              </article>
            ))}
          </div>
          <form className="comment-form" onSubmit={(event) => { event.preventDefault(); if (!comment.trim()) return; onAddComment({ id: crypto.randomUUID(), author: currentUser, content: comment.trim(), status: "OPEN", parentCommentId: replyTo, createdAt: new Date().toISOString() }); setComment(""); setReplyTo(undefined); }}>
            {replyTo && <div className="reply-label">Antwort auf Kommentar <button type="button" onClick={() => setReplyTo(undefined)}><X size={13} /></button></div>}
            <label><span className="sr-only">Kommentar</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={replyTo ? "Antwort schreiben …" : "Kommentar hinzufügen …"} rows={3} /></label>
            <button type="submit" disabled={!comment.trim()}><Send size={15} /> Senden</button>
          </form>
        </>
      ) : (
        <div className="versions-list">
          {page.versions.length === 0 && <div className="panel-empty"><Clock3 size={25} /><p>Die erste Version entsteht nach einer größeren Änderung.</p></div>}
          {[...page.versions].reverse().map((version) => (
            <article key={version.id}>
              <strong>{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(version.createdAt))}</strong>
              <p>{version.title}</p>
              <small>von {version.createdBy.name}</small>
              <button type="button" onClick={() => onRestoreVersion(version)}><RotateCcw size={14} /> Wiederherstellen</button>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
