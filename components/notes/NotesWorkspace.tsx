"use client";

import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  History,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDemoWorkspace } from "../../lib/demo-notes";
import { useRealtimeNote } from "../../hooks/use-realtime-note";
import type {
  Attachment,
  MemberRole,
  NoteComment,
  NotePage,
  NoteVersion,
  Notebook,
  QuickNote,
  SaveStatus,
  Section,
  TrashItem,
  WorkspaceState,
  WorkspaceUser,
} from "../../types/notes";
import { NoteSidePanel } from "./NoteSidePanel";
import { PageList } from "./PageList";
import { RichTextEditor } from "./RichTextEditor";
import { MainNavigation, MobileWorkspaceNav, NotebookPane, type NavigationKey } from "./WorkspaceSidebar";

type NotesWorkspaceProps = {
  user: WorkspaceUser;
  onLogout: () => void;
};

const sectionColors = ["#7567d8", "#4eb7b6", "#ef9e66", "#e36f8d", "#5f88d8", "#7eb46a"];

function now() {
  return new Date().toISOString();
}

function pageTemplate(user: WorkspaceUser, position: number, title = "Unbenannte Seite"): NotePage {
  const timestamp = now();
  return {
    id: crypto.randomUUID(),
    title,
    content: "<p></p>",
    plainTextContent: "",
    position,
    isFavorite: false,
    createdBy: user,
    updatedBy: user,
    createdAt: timestamp,
    updatedAt: timestamp,
    comments: [],
    versions: [],
    attachments: [],
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function NotesWorkspace({ user, onLogout }: NotesWorkspaceProps) {
  const storageKey = `nexa-notes-workspace:${user.id}`;
  const [profile, setProfile] = useState<WorkspaceUser>(user);
  const [state, setState] = useState<WorkspaceState>(() => createDemoWorkspace(user));
  const [hydrated, setHydrated] = useState(false);
  const [activeNav, setActiveNav] = useState<NavigationKey>("notebooks");
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [selectedNotebookId, setSelectedNotebookId] = useState("notebook-welcome");
  const [selectedSectionId, setSelectedSectionId] = useState("section-general");
  const [selectedPageId, setSelectedPageId] = useState("page-welcome");
  const [selectedQuickNoteId, setSelectedQuickNoteId] = useState("quick-first");
  const [pageQuery, setPageQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [sidePanel, setSidePanel] = useState<"comments" | "versions" | null>(null);
  const [shareNotebook, setShareNotebook] = useState<Notebook | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("EDITOR");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [toast, setToast] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionTimes = useRef<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) setState(JSON.parse(stored) as WorkspaceState);
        const storedTheme = localStorage.getItem("nexa-notes-theme") as typeof theme | null;
        if (storedTheme) setTheme(storedTheme);
      } catch {
        setToast("Lokale Daten konnten nicht geladen werden. Die Beispieldaten wurden geöffnet.");
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey]);

  const saveNow = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      setSaveStatus(navigator.onLine ? "saved" : "offline");
    } catch {
      setSaveStatus("error");
    }
  }, [state, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const statusTimer = setTimeout(() => setSaveStatus(navigator.onLine ? "saving" : "offline"), 0);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, 700);
    return () => { clearTimeout(statusTimer); if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hydrated, saveNow, state]);

  useEffect(() => {
    const online = () => { setSaveStatus("saving"); setTimeout(saveNow, 250); };
    const offline = () => setSaveStatus("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [saveNow]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "s") { event.preventDefault(); saveNow(); setToast("Notiz wurde gespeichert."); }
      if (key === "f") { event.preventDefault(); setActiveNav("search"); setTimeout(() => document.querySelector<HTMLInputElement>("#global-note-search")?.focus(), 0); }
      if (key === "n" && event.shiftKey) { event.preventDefault(); createQuickNote(); }
      else if (key === "n") { event.preventDefault(); createPage(); }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4_000);
    return () => clearTimeout(timer);
  }, [toast]);

  const notebook = state.notebooks.find((item) => item.id === selectedNotebookId && !item.deletedAt);
  const section = notebook?.sections.find((item) => item.id === selectedSectionId && !item.deletedAt);
  const page = section?.pages.find((item) => item.id === selectedPageId && !item.deletedAt);
  const quickNote = state.quickNotes.find((item) => item.id === selectedQuickNoteId && !item.deletedAt);
  const { activeEditors, publish: publishRealtimeUpdate } = useRealtimeNote(page?.id, profile, (update) => {
    updatePage(update.id, (entry) => new Date(update.updatedAt).getTime() > new Date(entry.updatedAt).getTime()
      ? { ...entry, title: update.title, content: update.content, plainTextContent: update.plainTextContent, updatedAt: update.updatedAt, updatedBy: update.updatedBy }
      : entry);
  });

  function selectNotebook(id: string) {
    const nextNotebook = state.notebooks.find((item) => item.id === id);
    const firstSection = nextNotebook?.sections.filter((item) => !item.deletedAt).sort((a, b) => a.position - b.position)[0];
    const firstPage = firstSection?.pages.filter((item) => !item.deletedAt).sort((a, b) => a.position - b.position)[0];
    setSelectedNotebookId(id);
    setSelectedSectionId(firstSection?.id ?? "");
    setSelectedPageId(firstPage?.id ?? "");
    setActiveNav("notebooks");
  }

  function selectSection(id: string) {
    const nextSection = notebook?.sections.find((item) => item.id === id);
    const firstPage = nextSection?.pages.filter((item) => !item.deletedAt).sort((a, b) => a.position - b.position)[0];
    setSelectedSectionId(id);
    setSelectedPageId(firstPage?.id ?? "");
  }

  function updateNotebook(notebookId: string, updater: (item: Notebook) => Notebook) {
    setState((current) => ({ ...current, notebooks: current.notebooks.map((item) => item.id === notebookId ? updater(item) : item) }));
  }

  function updateSection(sectionId: string, updater: (item: Section) => Section) {
    if (!notebook) return;
    updateNotebook(notebook.id, (item) => ({ ...item, updatedAt: now(), sections: item.sections.map((entry) => entry.id === sectionId ? updater(entry) : entry) }));
  }

  function updatePage(pageId: string, updater: (item: NotePage) => NotePage) {
    if (!section) return;
    updateSection(section.id, (item) => ({ ...item, updatedAt: now(), pages: item.pages.map((entry) => entry.id === pageId ? updater(entry) : entry) }));
  }

  function addNotebook() {
    const name = window.prompt("Name des neuen Notizbuchs", "Neues Notizbuch")?.trim();
    if (!name) return;
    const timestamp = now();
    const firstPage = pageTemplate(profile, 0, "Erste Notiz");
    const next: Notebook = {
      id: crypto.randomUUID(), name, description: "", color: sectionColors[state.notebooks.length % sectionColors.length], ownerId: profile.id,
      isFavorite: false, createdAt: timestamp, updatedAt: timestamp,
      members: [{ id: crypto.randomUUID(), user: profile, role: "OWNER", lastActiveAt: timestamp }],
      sections: [{ id: crypto.randomUUID(), name: "Allgemein", color: sectionColors[0], position: 0, isFavorite: false, createdAt: timestamp, updatedAt: timestamp, pages: [firstPage] }],
    };
    setState((current) => ({ ...current, notebooks: [...current.notebooks, next] }));
    setSelectedNotebookId(next.id); setSelectedSectionId(next.sections[0].id); setSelectedPageId(firstPage.id); setActiveNav("notebooks");
  }

  function renameNotebook(item: Notebook) {
    const name = window.prompt("Notizbuch umbenennen", item.name)?.trim();
    if (name) updateNotebook(item.id, (entry) => ({ ...entry, name, updatedAt: now() }));
  }

  function deleteNotebook(item: Notebook) {
    if (!window.confirm(`„${item.name}“ in den Papierkorb verschieben?`)) return;
    const deletedAt = now();
    updateNotebook(item.id, (entry) => ({ ...entry, deletedAt }));
    setState((current) => ({ ...current, trash: [...current.trash, { id: item.id, type: "notebook", title: item.name, deletedAt, payload: item }] }));
    const next = state.notebooks.find((entry) => entry.id !== item.id && !entry.deletedAt);
    if (next) selectNotebook(next.id); else { setSelectedNotebookId(""); setSelectedSectionId(""); setSelectedPageId(""); }
  }

  function addSection() {
    if (!notebook) return;
    const name = window.prompt("Name des neuen Abschnitts", "Neuer Abschnitt")?.trim();
    if (!name) return;
    const timestamp = now();
    const next: Section = { id: crypto.randomUUID(), name, color: sectionColors[notebook.sections.length % sectionColors.length], position: notebook.sections.length, isFavorite: false, createdAt: timestamp, updatedAt: timestamp, pages: [] };
    updateNotebook(notebook.id, (item) => ({ ...item, sections: [...item.sections, next] }));
    setSelectedSectionId(next.id); setSelectedPageId("");
  }

  function renameSection(item: Section) {
    const name = window.prompt("Abschnitt umbenennen", item.name)?.trim();
    if (name) updateSection(item.id, (entry) => ({ ...entry, name, updatedAt: now() }));
  }

  function deleteSection(item: Section) {
    if (!window.confirm(`Abschnitt „${item.name}“ mit allen Seiten in den Papierkorb verschieben?`)) return;
    const deletedAt = now();
    updateSection(item.id, (entry) => ({ ...entry, deletedAt }));
    setState((current) => ({ ...current, trash: [...current.trash, { id: item.id, type: "section", title: item.name, deletedAt, payload: item, notebookId: notebook?.id }] }));
    const next = notebook?.sections.find((entry) => entry.id !== item.id && !entry.deletedAt);
    setSelectedSectionId(next?.id ?? ""); setSelectedPageId(next?.pages.find((entry) => !entry.deletedAt)?.id ?? "");
  }

  function moveSection(item: Section, direction: -1 | 1) {
    if (!notebook) return;
    const ordered = [...notebook.sections].filter((entry) => !entry.deletedAt).sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const target = ordered[index + direction];
    if (!target) return;
    updateNotebook(notebook.id, (entry) => ({ ...entry, sections: entry.sections.map((sectionEntry) => sectionEntry.id === item.id ? { ...sectionEntry, position: target.position } : sectionEntry.id === target.id ? { ...sectionEntry, position: item.position } : sectionEntry) }));
  }

  function dropSection(sourceId: string, targetId: string) {
    if (!notebook) return;
    const ordered = [...notebook.sections].filter((entry) => !entry.deletedAt).sort((a, b) => a.position - b.position);
    const sourceIndex = ordered.findIndex((entry) => entry.id === sourceId);
    const targetIndex = ordered.findIndex((entry) => entry.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const positions = new Map(ordered.map((entry, index) => [entry.id, index]));
    updateNotebook(notebook.id, (entry) => ({ ...entry, sections: entry.sections.map((sectionEntry) => ({ ...sectionEntry, position: positions.get(sectionEntry.id) ?? sectionEntry.position })) }));
  }

  function changeSectionColor(item: Section) {
    const nextIndex = (sectionColors.indexOf(item.color) + 1) % sectionColors.length;
    updateSection(item.id, (entry) => ({ ...entry, color: sectionColors[nextIndex], updatedAt: now() }));
  }

  function createPage() {
    if (!section) { setToast("Wähle zuerst einen Abschnitt aus."); return; }
    const next = pageTemplate(profile, section.pages.length);
    updateSection(section.id, (item) => ({ ...item, pages: [...item.pages, next] }));
    setSelectedPageId(next.id); setActiveNav("notebooks");
  }

  function renamePage(item: NotePage) {
    const title = window.prompt("Seite umbenennen", item.title)?.trim();
    if (title) updatePage(item.id, (entry) => ({ ...entry, title, updatedAt: now(), updatedBy: profile }));
  }

  function duplicatePage(item: NotePage) {
    if (!section) return;
    const copy: NotePage = { ...item, id: crypto.randomUUID(), title: `${item.title} – Kopie`, position: section.pages.length, createdAt: now(), updatedAt: now(), comments: [], versions: [] };
    updateSection(section.id, (entry) => ({ ...entry, pages: [...entry.pages, copy] })); setSelectedPageId(copy.id);
  }

  function movePage(item: NotePage) {
    if (!notebook || !section) return;
    const targets = notebook.sections.filter((entry) => entry.id !== section.id && !entry.deletedAt);
    if (!targets.length) { setToast("Erstelle zuerst einen weiteren Abschnitt."); return; }
    const name = window.prompt(`Zielabschnitt: ${targets.map((entry) => entry.name).join(", ")}`, targets[0].name)?.trim();
    const target = targets.find((entry) => entry.name.toLowerCase() === name?.toLowerCase());
    if (!target) { if (name) setToast("Der Zielabschnitt wurde nicht gefunden."); return; }
    updateNotebook(notebook.id, (entry) => ({ ...entry, sections: entry.sections.map((sectionEntry) => sectionEntry.id === section.id ? { ...sectionEntry, pages: sectionEntry.pages.filter((pageEntry) => pageEntry.id !== item.id) } : sectionEntry.id === target.id ? { ...sectionEntry, pages: [...sectionEntry.pages, { ...item, position: sectionEntry.pages.length }] } : sectionEntry) }));
    setSelectedSectionId(target.id); setSelectedPageId(item.id);
  }

  function deletePage(item: NotePage) {
    if (!window.confirm(`Seite „${item.title}“ in den Papierkorb verschieben?`)) return;
    const deletedAt = now();
    updatePage(item.id, (entry) => ({ ...entry, deletedAt }));
    setState((current) => ({ ...current, trash: [...current.trash, { id: item.id, type: "page", title: item.title, deletedAt, payload: item, parentId: section?.id, notebookId: notebook?.id }] }));
    setSelectedPageId(section?.pages.find((entry) => entry.id !== item.id && !entry.deletedAt)?.id ?? "");
  }

  function reorderPage(item: NotePage, direction: -1 | 1) {
    if (!section) return;
    const ordered = [...section.pages].filter((entry) => !entry.deletedAt).sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const target = ordered[index + direction];
    if (!target) return;
    updateSection(section.id, (entry) => ({ ...entry, pages: entry.pages.map((pageEntry) => pageEntry.id === item.id ? { ...pageEntry, position: target.position } : pageEntry.id === target.id ? { ...pageEntry, position: item.position } : pageEntry) }));
  }

  function dropPage(sourceId: string, targetId: string) {
    if (!section) return;
    const ordered = [...section.pages].filter((entry) => !entry.deletedAt).sort((a, b) => a.position - b.position);
    const sourceIndex = ordered.findIndex((entry) => entry.id === sourceId);
    const targetIndex = ordered.findIndex((entry) => entry.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    const positions = new Map(ordered.map((entry, index) => [entry.id, index]));
    updateSection(section.id, (entry) => ({ ...entry, pages: entry.pages.map((pageEntry) => ({ ...pageEntry, position: positions.get(pageEntry.id) ?? pageEntry.position })) }));
  }

  function updateCurrentPage(content: string, plainTextContent: string) {
    if (!page) return;
    const updatedAt = now();
    const lastVersion = versionTimes.current[page.id] ?? 0;
    updatePage(page.id, (entry) => {
      let versions = entry.versions;
      if (Date.now() - lastVersion > 5 * 60_000 && entry.content !== content && entry.content !== "<p></p>") {
        versions = [...versions, { id: crypto.randomUUID(), title: entry.title, content: entry.content, createdBy: profile, createdAt: now() }];
        versionTimes.current[page.id] = Date.now();
      }
      return { ...entry, content, plainTextContent, versions, updatedAt, updatedBy: profile };
    });
    publishRealtimeUpdate({ id: page.id, title: page.title, content, plainTextContent, updatedAt, updatedBy: profile });
  }

  function createQuickNote() {
    const next: QuickNote = { id: crypto.randomUUID(), title: "Schnelle Notiz", content: "<p></p>", plainTextContent: "", createdAt: now(), updatedAt: now() };
    setState((current) => ({ ...current, quickNotes: [next, ...current.quickNotes] })); setSelectedQuickNoteId(next.id); setActiveNav("quick");
  }

  function updateQuickNote(updater: (item: QuickNote) => QuickNote) {
    if (!quickNote) return;
    setState((current) => ({ ...current, quickNotes: current.quickNotes.map((item) => item.id === quickNote.id ? updater(item) : item) }));
  }

  function moveQuickNoteToNotebook() {
    if (!quickNote || !section) { setToast("Öffne zuerst ein Notizbuch und einen Abschnitt."); return; }
    const moved = { ...pageTemplate(profile, section.pages.length, quickNote.title), content: quickNote.content, plainTextContent: quickNote.plainTextContent };
    updateSection(section.id, (item) => ({ ...item, pages: [...item.pages, moved] }));
    setState((current) => ({ ...current, quickNotes: current.quickNotes.filter((item) => item.id !== quickNote.id) }));
    setSelectedPageId(moved.id); setActiveNav("notebooks"); setToast("Schnelle Notiz wurde verschoben.");
  }

  function addAttachment(attachment: Attachment) {
    if (page) updatePage(page.id, (entry) => ({ ...entry, attachments: [...entry.attachments, attachment], updatedAt: now() }));
  }

  function inviteMember(event: React.FormEvent) {
    event.preventDefault();
    if (!shareNotebook || !/^\S+@\S+\.\S+$/.test(inviteEmail)) { setToast("Bitte gib eine gültige E-Mail-Adresse ein."); return; }
    updateNotebook(shareNotebook.id, (item) => ({ ...item, members: [...item.members, { id: crypto.randomUUID(), user: { id: crypto.randomUUID(), name: inviteEmail.split("@")[0], email: inviteEmail.toLowerCase() }, role: inviteRole, lastActiveAt: now() }] }));
    setInviteEmail(""); setToast("Einladung wurde lokal vorgemerkt.");
  }

  function restoreTrash(item: TrashItem) {
    if (item.type === "notebook") setState((current) => ({ ...current, notebooks: current.notebooks.map((entry) => entry.id === item.id ? { ...entry, deletedAt: undefined } : entry), trash: current.trash.filter((entry) => entry.id !== item.id) }));
    if (item.type === "section" && item.notebookId) updateNotebook(item.notebookId, (entry) => ({ ...entry, sections: entry.sections.map((sectionEntry) => sectionEntry.id === item.id ? { ...sectionEntry, deletedAt: undefined } : sectionEntry) }));
    if (item.type === "page" && item.parentId && item.notebookId) updateNotebook(item.notebookId, (entry) => ({ ...entry, sections: entry.sections.map((sectionEntry) => sectionEntry.id === item.parentId ? { ...sectionEntry, pages: sectionEntry.pages.map((pageEntry) => pageEntry.id === item.id ? { ...pageEntry, deletedAt: undefined } : pageEntry) } : sectionEntry) }));
    if (item.type !== "notebook") setState((current) => ({ ...current, trash: current.trash.filter((entry) => entry.id !== item.id) }));
  }

  const globalResults = useMemo(() => {
    const term = globalQuery.trim().toLowerCase();
    if (!term) return [];
    return state.notebooks.flatMap((book) => book.sections.flatMap((sectionItem) => sectionItem.pages.map((pageItem) => ({ book, section: sectionItem, page: pageItem })))).filter((result) => !result.page.deletedAt && `${result.book.name} ${result.section.name} ${result.page.title} ${result.page.plainTextContent} ${result.page.comments.map((item) => item.content).join(" ")} ${result.page.attachments.map((item) => item.filename).join(" ")}`.toLowerCase().includes(term));
  }, [globalQuery, state.notebooks]);

  function openResult(result: { book: Notebook; section: Section; page: NotePage }) {
    setSelectedNotebookId(result.book.id); setSelectedSectionId(result.section.id); setSelectedPageId(result.page.id); setActiveNav("notebooks");
  }

  const utilityView = activeNav !== "notebooks";

  return (
    <div className={`notes-workspace theme-${theme}${navigationCollapsed ? " nav-collapsed" : ""}${utilityView ? " utility-view" : ""}`}>
      <MainNavigation user={profile} active={activeNav} collapsed={navigationCollapsed} onToggle={() => setNavigationCollapsed((value) => !value)} onSelect={setActiveNav} onQuickNote={createQuickNote} onLogout={onLogout} />
      {!utilityView && (
        <NotebookPane
          notebooks={state.notebooks} selectedNotebookId={selectedNotebookId} selectedSectionId={selectedSectionId}
          onSelectNotebook={selectNotebook} onSelectSection={selectSection} onAddNotebook={addNotebook}
          onRenameNotebook={renameNotebook} onDeleteNotebook={deleteNotebook} onShareNotebook={setShareNotebook}
          onToggleNotebookFavorite={(item) => updateNotebook(item.id, (entry) => ({ ...entry, isFavorite: !entry.isFavorite }))}
          onAddSection={addSection} onRenameSection={renameSection} onDeleteSection={deleteSection} onMoveSection={moveSection}
          onToggleSectionFavorite={(item) => updateSection(item.id, (entry) => ({ ...entry, isFavorite: !entry.isFavorite }))}
          onDropSection={dropSection}
          onChangeSectionColor={changeSectionColor}
        />
      )}
      {!utilityView && (
        <PageList section={section} selectedPageId={selectedPageId} query={pageQuery} onQueryChange={setPageQuery} onSelect={setSelectedPageId} onCreate={createPage}
          onRename={renamePage} onDuplicate={duplicatePage} onMove={movePage} onDelete={deletePage} onReorder={reorderPage}
          onDropPage={dropPage}
          onToggleFavorite={(item) => updatePage(item.id, (entry) => ({ ...entry, isFavorite: !entry.isFavorite, updatedAt: now() }))}
        />
      )}

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="breadcrumbs"><BookOpen size={16} /><span>{activeNav === "notebooks" ? notebook?.name : "Nexa Notes"}</span>{activeNav === "notebooks" && section && <><ChevronRight size={14} /><strong>{section.name}</strong></>}</div>
          <div className="topbar-actions">
            {activeNav === "notebooks" && notebook && <div className="presence" aria-label="Aktive Benutzer">{activeEditors.slice(0, 3).map((editor) => <span key={editor.id} title={`${editor.name} · gerade aktiv`}>{editor.name.slice(0, 2).toUpperCase()}</span>)}</div>}
            <button type="button" onClick={createQuickNote}><Plus size={16} /> <span>Schnelle Notiz</span></button>
            {activeNav === "notebooks" && page && <><button type="button" onClick={() => setSidePanel(sidePanel === "comments" ? null : "comments")} aria-label="Kommentare"><MessageSquare size={17} /><span className="action-count">{page.comments.filter((item) => item.status === "OPEN").length}</span></button><button type="button" onClick={() => setSidePanel(sidePanel === "versions" ? null : "versions")} aria-label="Versionsverlauf"><History size={17} /></button></>}
            <button type="button" aria-label="Benachrichtigungen"><Bell size={17} /></button>
          </div>
        </header>

        {activeNav === "notebooks" && (
          page ? (
            <div className="note-editor-area">
              <div className="note-title-row">
                <input className="note-title-input" aria-label="Seitentitel" value={page.title} onChange={(event) => updatePage(page.id, (entry) => ({ ...entry, title: event.target.value, updatedAt: now(), updatedBy: profile }))} placeholder="Seitentitel" />
                <button className={page.isFavorite ? "is-favorite" : ""} type="button" onClick={() => updatePage(page.id, (entry) => ({ ...entry, isFavorite: !entry.isFavorite }))} aria-label="Favorit umschalten" title="Favorit"><Star size={19} fill={page.isFavorite ? "currentColor" : "none"} /></button>
              </div>
              <div className="note-meta-row">
                <span>Erstellt {formatDate(page.createdAt)}</span><span>Bearbeitet von {page.updatedBy.name}</span>
                <span className={`save-indicator status-${saveStatus}`}>{saveStatus === "saving" && <Cloud size={14} />}{saveStatus === "saved" && <><Check size={14} /> Gespeichert</>}{saveStatus === "offline" && <><WifiOff size={14} /> Offline gespeichert</>}{saveStatus === "error" && <><CloudOff size={14} /> Fehler beim Speichern</>}{saveStatus === "saving" && "Wird gespeichert …"}</span>
              </div>
              <RichTextEditor content={page.content} editable onChange={updateCurrentPage} onAttachment={addAttachment} onError={setToast} />
              {page.attachments.length > 0 && <div className="attachment-strip"><strong>Anhänge</strong>{page.attachments.map((item) => <a key={item.id} href={item.url} download={item.filename}>{item.filename}<small>{Math.ceil(item.fileSize / 1024)} KB</small></a>)}</div>}
            </div>
          ) : <div className="workspace-empty"><Sparkles size={38} /><h2>Bereit für eine neue Idee?</h2><p>Erstelle eine Seite und beginne zu schreiben.</p><button type="button" onClick={createPage}><Plus size={17} /> Neue Seite</button></div>
        )}

        {activeNav === "home" && <HomeView state={state} onOpen={openResult} onCreateNotebook={addNotebook} onQuickNote={createQuickNote} />}
        {activeNav === "quick" && <QuickNotesView notes={state.quickNotes.filter((item) => !item.deletedAt)} selected={quickNote} onSelect={setSelectedQuickNoteId} onCreate={createQuickNote} onUpdate={updateQuickNote} onMove={moveQuickNoteToNotebook} onDelete={(item) => { const deletedAt = now(); setState((current) => ({ ...current, quickNotes: current.quickNotes.map((entry) => entry.id === item.id ? { ...entry, deletedAt } : entry), trash: [...current.trash, { id: item.id, type: "quick-note", title: item.title, deletedAt, payload: item }] })); }} onError={setToast} />}
        {activeNav === "search" && <SearchView query={globalQuery} onQuery={setGlobalQuery} results={globalResults} onOpen={openResult} />}
        {activeNav === "favorites" && <FavoritesView notebooks={state.notebooks} onOpen={openResult} onOpenNotebook={selectNotebook} />}
        {activeNav === "shared" && <CollectionView title="Mit mir geteilt" icon={<Users size={24} />} entries={state.notebooks.filter((book) => book.members.length > 1).flatMap((book) => book.sections.flatMap((sectionItem) => sectionItem.pages.filter((pageItem) => !pageItem.deletedAt).map((pageItem) => ({ book, section: sectionItem, page: pageItem }))))} onOpen={openResult} />}
        {activeNav === "trash" && <TrashView items={state.trash} onRestore={restoreTrash} onDelete={(id) => setState((current) => ({ ...current, trash: current.trash.filter((entry) => entry.id !== id) }))} onEmpty={() => { if (state.trash.length && window.confirm("Papierkorb endgültig leeren?")) setState((current) => ({ ...current, trash: [] })); }} />}
        {activeNav === "settings" && <SettingsView profile={profile} onProfile={setProfile} theme={theme} onTheme={(value) => { setTheme(value); localStorage.setItem("nexa-notes-theme", value); }} />}
      </main>

      {page && <NoteSidePanel mode={sidePanel} page={page} currentUser={profile} onClose={() => setSidePanel(null)} onAddComment={(comment: NoteComment) => updatePage(page.id, (entry) => ({ ...entry, comments: [...entry.comments, comment] }))} onToggleComment={(commentId) => updatePage(page.id, (entry) => ({ ...entry, comments: entry.comments.map((comment) => comment.id === commentId ? { ...comment, status: comment.status === "OPEN" ? "RESOLVED" : "OPEN" } : comment) }))} onRestoreVersion={(version: NoteVersion) => { updatePage(page.id, (entry) => ({ ...entry, title: version.title, content: version.content, updatedAt: now(), updatedBy: profile })); setSidePanel(null); setToast("Frühere Version wurde wiederhergestellt."); }} />}
      <MobileWorkspaceNav active={activeNav} onSelect={setActiveNav} />

      {shareNotebook && <ShareDialog notebook={state.notebooks.find((item) => item.id === shareNotebook.id) ?? shareNotebook} email={inviteEmail} role={inviteRole} onEmail={setInviteEmail} onRole={setInviteRole} onSubmit={inviteMember} onClose={() => setShareNotebook(null)} onChangeRole={(memberId, role) => updateNotebook(shareNotebook.id, (item) => ({ ...item, members: item.members.map((member) => member.id === memberId ? { ...member, role } : member) }))} onRemove={(memberId) => updateNotebook(shareNotebook.id, (item) => ({ ...item, members: item.members.filter((member) => member.id !== memberId || member.role === "OWNER") }))} />}
      {toast && <div className="workspace-toast" role="status"><span>{toast}</span><button type="button" onClick={() => setToast("")} aria-label="Hinweis schließen"><X size={15} /></button></div>}
    </div>
  );
}

type Result = { book: Notebook; section: Section; page: NotePage };

function HomeView({ state, onOpen, onCreateNotebook, onQuickNote }: { state: WorkspaceState; onOpen: (result: Result) => void; onCreateNotebook: () => void; onQuickNote: () => void }) {
  const recent = state.notebooks.flatMap((book) => book.sections.flatMap((section) => section.pages.filter((page) => !page.deletedAt).map((page) => ({ book, section, page })))).sort((a, b) => new Date(b.page.updatedAt).getTime() - new Date(a.page.updatedAt).getTime()).slice(0, 6);
  return <div className="utility-content home-view"><div className="utility-hero"><div><span>Guten Tag</span><h1>Was möchtest du festhalten?</h1><p>Deine wichtigsten Gedanken und gemeinsamen Projekte an einem Ort.</p></div><Sparkles size={42} /></div><div className="home-actions"><button type="button" onClick={onCreateNotebook}><BookOpen size={20} /><strong>Notizbuch erstellen</strong><span>Für ein neues Thema oder Projekt</span></button><button type="button" onClick={onQuickNote}><Plus size={20} /><strong>Schnelle Notiz</strong><span>Gedanken sofort festhalten</span></button></div><section><header><h2>Zuletzt bearbeitet</h2></header><div className="result-grid">{recent.map((result) => <button key={result.page.id} type="button" onClick={() => onOpen(result)}><span className="result-color" style={{ background: result.section.color }} /><strong>{result.page.title}</strong><p>{result.page.plainTextContent || "Noch kein Inhalt"}</p><small>{result.book.name} · {formatDate(result.page.updatedAt)}</small></button>)}</div></section></div>;
}

function QuickNotesView({ notes, selected, onSelect, onCreate, onUpdate, onMove, onDelete, onError }: { notes: QuickNote[]; selected?: QuickNote; onSelect: (id: string) => void; onCreate: () => void; onUpdate: (updater: (item: QuickNote) => QuickNote) => void; onMove: () => void; onDelete: (item: QuickNote) => void; onError: (message: string) => void }) {
  return <div className="quick-notes-view"><aside><header><div><span>Direkt erfasst</span><h2>Schnelle Notizen</h2></div><button type="button" onClick={onCreate}><Plus size={18} /></button></header>{[...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map((item) => <button key={item.id} className={item.id === selected?.id ? "is-active" : ""} type="button" onClick={() => onSelect(item.id)}><strong>{item.title}</strong><p>{item.plainTextContent || "Noch kein Inhalt"}</p><small>{formatDate(item.updatedAt)}</small></button>)}</aside>{selected ? <div className="quick-editor"><div className="quick-title"><input value={selected.title} aria-label="Titel der schnellen Notiz" onChange={(event) => onUpdate((item) => ({ ...item, title: event.target.value, updatedAt: now() }))} /><div><button type="button" onClick={onMove}>In Notizbuch verschieben</button><button type="button" onClick={() => onDelete(selected)} aria-label="Schnelle Notiz löschen"><Trash2 size={16} /></button></div></div><RichTextEditor content={selected.content} editable onChange={(content, plainTextContent) => onUpdate((item) => ({ ...item, content, plainTextContent, updatedAt: now() }))} onAttachment={() => undefined} onError={onError} /></div> : <div className="workspace-empty"><Plus size={32} /><h2>Neue schnelle Notiz</h2><button type="button" onClick={onCreate}>Erstellen</button></div>}</div>;
}

function SearchView({ query, onQuery, results, onOpen }: { query: string; onQuery: (value: string) => void; results: Result[]; onOpen: (result: Result) => void }) {
  return <div className="utility-content"><div className="utility-title"><Search size={24} /><div><span>Alles finden</span><h1>Globale Suche</h1></div></div><label className="global-search"><Search size={19} /><input id="global-note-search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Notizbücher, Seiten, Inhalte, Kommentare und Anhänge durchsuchen …" /></label>{query && <p className="result-count">{results.length} Ergebnisse</p>}<div className="search-results">{results.map((result) => <button key={result.page.id} type="button" onClick={() => onOpen(result)}><span style={{ background: result.section.color }} /><div><strong>{result.page.title}</strong><p>{result.page.plainTextContent}</p><small>{result.book.name} · {result.section.name}</small></div><ChevronRight size={17} /></button>)}</div>{query && results.length === 0 && <div className="workspace-empty"><Search size={30} /><h2>Keine Treffer</h2><p>Versuche einen anderen Suchbegriff.</p></div>}</div>;
}

function CollectionView({ title, icon, entries, onOpen }: { title: string; icon: React.ReactNode; entries: Result[]; onOpen: (result: Result) => void }) {
  return <div className="utility-content"><div className="utility-title">{icon}<div><span>Deine Sammlung</span><h1>{title}</h1></div></div><div className="result-grid">{entries.map((result) => <button key={result.page.id} type="button" onClick={() => onOpen(result)}><span className="result-color" style={{ background: result.section.color }} /><strong>{result.page.title}</strong><p>{result.page.plainTextContent || "Noch kein Inhalt"}</p><small>{result.book.name} · {result.section.name}</small></button>)}</div>{entries.length === 0 && <div className="workspace-empty"><Star size={30} /><h2>Noch keine Einträge</h2></div>}</div>;
}

function FavoritesView({ notebooks, onOpen, onOpenNotebook }: { notebooks: Notebook[]; onOpen: (result: Result) => void; onOpenNotebook: (id: string) => void }) {
  const favoriteBooks = notebooks.filter((book) => book.isFavorite && !book.deletedAt);
  const favoriteSections = notebooks.flatMap((book) => book.sections.filter((section) => section.isFavorite && !section.deletedAt).map((section) => ({ book, section })));
  const favoritePages = notebooks.flatMap((book) => book.sections.flatMap((section) => section.pages.filter((page) => page.isFavorite && !page.deletedAt).map((page) => ({ book, section, page }))));
  const empty = !favoriteBooks.length && !favoriteSections.length && !favoritePages.length;
  return <div className="utility-content"><div className="utility-title"><Star size={24} /><div><span>Deine Sammlung</span><h1>Favoriten</h1></div></div>{favoriteBooks.length > 0 && <><h2 className="collection-heading">Notizbücher</h2><div className="result-grid">{favoriteBooks.map((book) => <button key={book.id} type="button" onClick={() => onOpenNotebook(book.id)}><span className="result-color" style={{ background: book.color }} /><strong>{book.name}</strong><p>{book.description || "Notizbuch"}</p><small>{book.sections.length} Abschnitte</small></button>)}</div></>}{favoriteSections.length > 0 && <><h2 className="collection-heading">Abschnitte</h2><div className="result-grid">{favoriteSections.map(({ book, section }) => <button key={section.id} type="button" onClick={() => { const first = section.pages.find((page) => !page.deletedAt); if (first) onOpen({ book, section, page: first }); else onOpenNotebook(book.id); }}><span className="result-color" style={{ background: section.color }} /><strong>{section.name}</strong><p>{book.name}</p><small>{section.pages.length} Seiten</small></button>)}</div></>}{favoritePages.length > 0 && <><h2 className="collection-heading">Seiten</h2><div className="result-grid">{favoritePages.map((result) => <button key={result.page.id} type="button" onClick={() => onOpen(result)}><span className="result-color" style={{ background: result.section.color }} /><strong>{result.page.title}</strong><p>{result.page.plainTextContent || "Noch kein Inhalt"}</p><small>{result.book.name} · {result.section.name}</small></button>)}</div></>}{empty && <div className="workspace-empty"><Star size={30} /><h2>Noch keine Favoriten</h2></div>}</div>;
}

function TrashView({ items, onRestore, onDelete, onEmpty }: { items: TrashItem[]; onRestore: (item: TrashItem) => void; onDelete: (id: string) => void; onEmpty: () => void }) {
  return <div className="utility-content"><div className="utility-title-row"><div className="utility-title"><Trash2 size={24} /><div><span>30 Tage aufbewahrt</span><h1>Papierkorb</h1></div></div><button type="button" onClick={onEmpty} disabled={!items.length}>Papierkorb leeren</button></div><div className="trash-list">{items.map((item) => <article key={`${item.type}-${item.id}`}><div><strong>{item.title}</strong><span>{item.type === "notebook" ? "Notizbuch" : item.type === "section" ? "Abschnitt" : item.type === "page" ? "Seite" : "Schnelle Notiz"} · gelöscht {formatDate(item.deletedAt)}</span></div><button type="button" onClick={() => onRestore(item)}>Wiederherstellen</button><button type="button" onClick={() => { if (window.confirm("Dieses Element endgültig löschen?")) onDelete(item.id); }}><Trash2 size={15} /> Endgültig löschen</button></article>)}</div>{!items.length && <div className="workspace-empty"><Trash2 size={32} /><h2>Der Papierkorb ist leer</h2></div>}</div>;
}

function SettingsView({ profile, onProfile, theme, onTheme }: { profile: WorkspaceUser; onProfile: (user: WorkspaceUser) => void; theme: "light" | "dark" | "system"; onTheme: (theme: "light" | "dark" | "system") => void }) {
  return <div className="utility-content settings-view"><div className="utility-title"><Settings size={24} /><div><span>Persönlicher Bereich</span><h1>Einstellungen</h1></div></div><section><h2>Profil</h2><div className="profile-settings"><span className="settings-avatar">{profile.name.slice(0, 2).toUpperCase()}</span><label>Name<input value={profile.name} onChange={(event) => onProfile({ ...profile, name: event.target.value })} /></label><label>E-Mail<input value={profile.email} disabled /></label></div></section><section><h2>Darstellung</h2><div className="theme-options"><button className={theme === "light" ? "is-active" : ""} type="button" onClick={() => onTheme("light")}><Sun size={20} /> Hell</button><button className={theme === "dark" ? "is-active" : ""} type="button" onClick={() => onTheme("dark")}><Moon size={20} /> Dunkel</button><button className={theme === "system" ? "is-active" : ""} type="button" onClick={() => onTheme("system")}><Settings size={20} /> System</button></div></section></div>;
}

function ShareDialog({ notebook, email, role, onEmail, onRole, onSubmit, onClose, onChangeRole, onRemove }: { notebook: Notebook; email: string; role: MemberRole; onEmail: (value: string) => void; onRole: (value: MemberRole) => void; onSubmit: (event: React.FormEvent) => void; onClose: () => void; onChangeRole: (memberId: string, role: MemberRole) => void; onRemove: (memberId: string) => void }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title"><header><div><Share2 size={20} /><div><span>Zusammenarbeiten</span><h2 id="share-title">„{notebook.name}“ teilen</h2></div></div><button type="button" onClick={onClose} aria-label="Dialog schließen"><X size={19} /></button></header><form onSubmit={onSubmit}><label><span>E-Mail-Adresse</span><input type="email" required value={email} onChange={(event) => onEmail(event.target.value)} placeholder="name@beispiel.de" /></label><label><span>Berechtigung</span><select value={role} onChange={(event) => onRole(event.target.value as MemberRole)}><option value="EDITOR">Bearbeiter</option><option value="COMMENTER">Kommentator</option><option value="VIEWER">Nur lesen</option></select></label><button type="submit">Einladen</button></form><div className="member-list"><h3>Personen mit Zugriff</h3>{notebook.members.map((member) => <article key={member.id}><span className="member-avatar">{member.user.name.slice(0, 2).toUpperCase()}</span><div><strong>{member.user.name}</strong><small>{member.user.email} · zuletzt aktiv {formatDate(member.lastActiveAt)}</small></div>{member.role === "OWNER" ? <span className="owner-label">Besitzer</span> : <><select aria-label={`Berechtigung für ${member.user.name}`} value={member.role} onChange={(event) => onChangeRole(member.id, event.target.value as MemberRole)}><option value="EDITOR">Bearbeiter</option><option value="COMMENTER">Kommentator</option><option value="VIEWER">Nur lesen</option></select><button type="button" onClick={() => onRemove(member.id)} aria-label={`${member.user.name} entfernen`}><X size={15} /></button></>}</article>)}</div></section></div>;
}
