"use client";

import { Copy, FilePlus2, Image as ImageIcon, MoreHorizontal, MoveRight, Search, Share2, Star, Trash2 } from "lucide-react";
import type { NotePage, Section } from "../../types/notes";
import { useState } from "react";

function relativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60_000));
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(value));
}

type PageListProps = {
  section?: Section;
  selectedPageId?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (pageId: string) => void;
  onCreate: () => void;
  onRename: (page: NotePage) => void;
  onDuplicate: (page: NotePage) => void;
  onMove: (page: NotePage) => void;
  onToggleFavorite: (page: NotePage) => void;
  onDelete: (page: NotePage) => void;
  onReorder: (page: NotePage, direction: -1 | 1) => void;
  onDropPage: (sourceId: string, targetId: string) => void;
};

export function PageList({
  section,
  selectedPageId,
  query,
  onQueryChange,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onMove,
  onToggleFavorite,
  onDelete,
  onReorder,
  onDropPage,
}: PageListProps) {
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const pages = [...(section?.pages ?? [])]
    .filter((page) => !page.deletedAt)
    .filter((page) => `${page.title} ${page.plainTextContent}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.position - b.position);

  return (
    <aside className="page-list-pane" aria-label="Notizseiten">
      <header className="page-list-heading">
        <div><span>Abschnitt</span><h2>{section?.name ?? "Keine Auswahl"}</h2></div>
        <button type="button" onClick={onCreate} disabled={!section} aria-label="Neue Seite" title="Neue Seite (Strg+N)"><FilePlus2 size={19} /></button>
      </header>
      <label className="page-search">
        <Search size={16} aria-hidden="true" />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Seiten filtern …" aria-label="Seiten filtern" />
      </label>

      <div className="page-cards">
        {pages.map((page, index) => (
          <article key={page.id} className={`page-card${page.id === selectedPageId ? " is-active" : ""}`} draggable onDragStart={() => setDraggedPageId(page.id)} onDragEnd={() => setDraggedPageId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedPageId && draggedPageId !== page.id) onDropPage(draggedPageId, page.id); setDraggedPageId(null); }}>
            <button className="page-card-main" type="button" onClick={() => onSelect(page.id)}>
              <div className="page-card-title-row">
                <strong>{page.title || "Unbenannte Seite"}</strong>
                <span className="page-badges">
                  {page.isFavorite && <Star size={13} fill="currentColor" aria-label="Favorit" />}
                  {page.isShared && <Share2 size={13} aria-label="Geteilt" />}
                </span>
              </div>
              <p>{page.plainTextContent || "Noch kein Inhalt"}</p>
              <footer><span>{relativeDate(page.updatedAt)}</span>{page.content.includes("<img") && <ImageIcon size={14} aria-label="Enthält Bild" />}</footer>
            </button>
            {page.id === selectedPageId && (
              <div className="page-card-actions" aria-label="Seitenaktionen">
                <button type="button" onClick={() => onToggleFavorite(page)} title="Favorit" aria-label="Favorit umschalten"><Star size={14} fill={page.isFavorite ? "currentColor" : "none"} /></button>
                <button type="button" onClick={() => onRename(page)} title="Umbenennen" aria-label="Seite umbenennen"><MoreHorizontal size={14} /></button>
                <button type="button" onClick={() => onDuplicate(page)} title="Duplizieren" aria-label="Seite duplizieren"><Copy size={14} /></button>
                <button type="button" onClick={() => onMove(page)} title="Verschieben" aria-label="Seite verschieben"><MoveRight size={14} /></button>
                <button type="button" disabled={index === 0} onClick={() => onReorder(page, -1)} title="Nach oben" aria-label="Seite nach oben">↑</button>
                <button type="button" disabled={index === pages.length - 1} onClick={() => onReorder(page, 1)} title="Nach unten" aria-label="Seite nach unten">↓</button>
                <button type="button" onClick={() => onDelete(page)} title="Löschen" aria-label="Seite löschen"><Trash2 size={14} /></button>
              </div>
            )}
          </article>
        ))}

        {section && pages.length === 0 && (
          <div className="empty-pages"><FilePlus2 size={28} /><strong>Noch keine Seiten</strong><p>Lege die erste Seite in diesem Abschnitt an.</p><button type="button" onClick={onCreate}>Neue Seite</button></div>
        )}
      </div>
    </aside>
  );
}
