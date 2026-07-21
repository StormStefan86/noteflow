"use client";

import {
  Archive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Home,
  Menu,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import type { Notebook, Section, WorkspaceUser } from "../../types/notes";
import { useState } from "react";

export type NavigationKey = "home" | "notebooks" | "quick" | "shared" | "favorites" | "trash" | "search" | "settings";

const navigation: Array<{ key: NavigationKey; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { key: "home", label: "Startseite", icon: Home },
  { key: "notebooks", label: "Alle Notizbücher", icon: BookOpen },
  { key: "quick", label: "Schnelle Notizen", icon: StickyNote },
  { key: "shared", label: "Mit mir geteilt", icon: Users },
  { key: "favorites", label: "Favoriten", icon: Star },
  { key: "trash", label: "Papierkorb", icon: Trash2 },
  { key: "search", label: "Suche", icon: Search },
  { key: "settings", label: "Einstellungen", icon: Settings },
];

type MainNavigationProps = {
  user: WorkspaceUser;
  active: NavigationKey;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (key: NavigationKey) => void;
  onQuickNote: () => void;
  onLogout: () => void;
};

export function MainNavigation({ user, active, collapsed, onToggle, onSelect, onQuickNote, onLogout }: MainNavigationProps) {
  return (
    <aside className={`main-navigation${collapsed ? " is-collapsed" : ""}`} aria-label="Hauptnavigation">
      <div className="workspace-brand-row">
        <span className="workspace-brand-mark">N</span>
        {!collapsed && <span className="workspace-brand-name">nexa notes</span>}
        <button className="nav-collapse" type="button" onClick={onToggle} aria-label={collapsed ? "Navigation ausklappen" : "Navigation einklappen"}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <button className="quick-note-primary" type="button" onClick={onQuickNote} title="Schnelle Notiz (Strg+Umschalt+N)">
        <FilePlus2 size={18} /> {!collapsed && <span>Schnelle Notiz</span>}
      </button>

      <nav className="nav-items">
        {navigation.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={active === key ? "is-active" : ""}
            type="button"
            onClick={() => onSelect(key)}
            aria-current={active === key ? "page" : undefined}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} /> {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <div className="nav-user">
        <span className="user-avatar">{user.name.slice(0, 2).toUpperCase()}</span>
        {!collapsed && (
          <span className="user-copy"><strong>{user.name}</strong><small>{user.email}</small></span>
        )}
        {!collapsed && <button type="button" onClick={onLogout}>Abmelden</button>}
      </div>
    </aside>
  );
}

type NotebookPaneProps = {
  notebooks: Notebook[];
  selectedNotebookId?: string;
  selectedSectionId?: string;
  onSelectNotebook: (id: string) => void;
  onSelectSection: (id: string) => void;
  onAddNotebook: () => void;
  onRenameNotebook: (notebook: Notebook) => void;
  onDeleteNotebook: (notebook: Notebook) => void;
  onShareNotebook: (notebook: Notebook) => void;
  onToggleNotebookFavorite: (notebook: Notebook) => void;
  onAddSection: () => void;
  onRenameSection: (section: Section) => void;
  onDeleteSection: (section: Section) => void;
  onToggleSectionFavorite: (section: Section) => void;
  onMoveSection: (section: Section, direction: -1 | 1) => void;
  onChangeSectionColor: (section: Section) => void;
  onDropSection: (sourceId: string, targetId: string) => void;
};

export function NotebookPane({
  notebooks,
  selectedNotebookId,
  selectedSectionId,
  onSelectNotebook,
  onSelectSection,
  onAddNotebook,
  onRenameNotebook,
  onDeleteNotebook,
  onShareNotebook,
  onToggleNotebookFavorite,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onToggleSectionFavorite,
  onMoveSection,
  onChangeSectionColor,
  onDropSection,
}: NotebookPaneProps) {
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const notebook = notebooks.find((item) => item.id === selectedNotebookId);
  return (
    <aside className="notebook-pane" aria-label="Notizbücher und Abschnitte">
      <header className="pane-heading">
        <div><span>Arbeitsbereich</span><h2>Notizbücher</h2></div>
        <button type="button" onClick={onAddNotebook} aria-label="Notizbuch hinzufügen" title="Notizbuch hinzufügen"><Plus size={18} /></button>
      </header>

      <div className="notebook-list">
        {notebooks.filter((item) => !item.deletedAt).map((item) => (
          <div key={item.id} className={`notebook-row${item.id === selectedNotebookId ? " is-active" : ""}`}>
            <button className="notebook-select" type="button" onClick={() => onSelectNotebook(item.id)}>
              <span className="notebook-color" style={{ background: item.color }} />
              <span>{item.name}</span>
            </button>
            {item.id === selectedNotebookId && (
              <div className="row-actions">
                <button type="button" title="Favorit" aria-label="Notizbuch als Favorit markieren" onClick={() => onToggleNotebookFavorite(item)}><Star size={14} fill={item.isFavorite ? "currentColor" : "none"} /></button>
                <button type="button" title="Teilen" aria-label="Notizbuch teilen" onClick={() => onShareNotebook(item)}><Share2 size={14} /></button>
                <button type="button" title="Umbenennen" aria-label="Notizbuch umbenennen" onClick={() => onRenameNotebook(item)}><Menu size={14} /></button>
                <button type="button" title="Löschen" aria-label="Notizbuch löschen" onClick={() => onDeleteNotebook(item)}><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {notebook && (
        <>
          <div className="pane-subheading">
            <span>Abschnitte</span>
            <button type="button" onClick={onAddSection}><Plus size={15} /> Abschnitt</button>
          </div>
          <div className="section-list">
            {[...notebook.sections].filter((item) => !item.deletedAt).sort((a, b) => a.position - b.position).map((section, index, visibleSections) => (
              <div key={section.id} className={`section-row${section.id === selectedSectionId ? " is-active" : ""}`} draggable onDragStart={() => setDraggedSectionId(section.id)} onDragEnd={() => setDraggedSectionId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedSectionId && draggedSectionId !== section.id) onDropSection(draggedSectionId, section.id); setDraggedSectionId(null); }}>
                <button className="section-select" type="button" onClick={() => onSelectSection(section.id)}>
                  <span className="section-color" style={{ background: section.color }} />
                  <span>{section.name}</span>
                  <small>{section.pages.filter((page) => !page.deletedAt).length}</small>
                </button>
                {section.id === selectedSectionId && (
                  <div className="section-actions">
                    <button type="button" aria-label="Abschnitt als Favorit markieren" title="Favorit" onClick={() => onToggleSectionFavorite(section)}><Star size={13} fill={section.isFavorite ? "currentColor" : "none"} /></button>
                    <button type="button" disabled={index === 0} aria-label="Abschnitt nach oben" title="Nach oben" onClick={() => onMoveSection(section, -1)}>↑</button>
                    <button type="button" disabled={index === visibleSections.length - 1} aria-label="Abschnitt nach unten" title="Nach unten" onClick={() => onMoveSection(section, 1)}>↓</button>
                    <button type="button" aria-label="Abschnittsfarbe ändern" title="Farbe" onClick={() => onChangeSectionColor(section)}><span className="color-dot" /></button>
                    <button type="button" aria-label="Abschnitt umbenennen" title="Umbenennen" onClick={() => onRenameSection(section)}>Aa</button>
                    <button type="button" aria-label="Abschnitt löschen" title="Löschen" onClick={() => onDeleteSection(section)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="notebook-pane-footer"><Archive size={15} /> Änderungen werden automatisch gespeichert</div>
    </aside>
  );
}

export function MobileWorkspaceNav({ active, onSelect }: { active: NavigationKey; onSelect: (key: NavigationKey) => void }) {
  return (
    <nav className="mobile-workspace-nav" aria-label="Mobile Navigation">
      {navigation.slice(0, 5).map(({ key, label, icon: Icon }) => (
        <button key={key} className={active === key ? "is-active" : ""} type="button" onClick={() => onSelect(key)}>
          <Icon size={19} /><span>{label === "Alle Notizbücher" ? "Notizen" : label.replace("Schnelle ", "")}</span>
        </button>
      ))}
    </nav>
  );
}
