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
        setToast("Lokale Daten konnten nicht geladen werden. Die Beispieldaten wurden geÃ¶ffnet.");
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
    if (!window.confirm(`â€ž${item.name}â€œ in den Papierkorb verschieben?`)) return;
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
    if (!window.confirm(`Abschnitt â€ž${item.name}â€œ mit allen Seiten in den Papierkorb verschieben?`)) return;
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
    if (!section) { setToast("WÃ¤hle zuerst einen Abschnitt aus."); return; }
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
    const copy: NotePage = { ...item, id: crypto.randomUUID(), title: `${item.title} â€“ Kopie`, position: section.pages.length, createdAt: now(), updatedAt: now(), comments: [], versions: [] };
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
    setSelectedSectionId(target.id); setSãn¼¶‰žËkºwµçq•Ñ¥½¹Y¥•ÜÑ¥Ñ±”ô‰5¥Ðµ¥È•Ñ•¥±Ðˆ¥½¸õìñUÍ•ÉÌÍ¥é”õìÈÑô€¼ùô•¹ÑÉ¥•ÌõíÍÑ…Ñ”¹¹½Ñ•‰½½­Ì¹™¥±Ñ•È ¡‰½½¬¤€ôø‰½½¬¹µ•µ‰•ÉÌ¹±•¹Ñ €ø€Ä¤¹™±…Ñ5…À ¡‰½½¬¤€ôø‰½½¬¹Í•Ñ¥½¹Ì¹™±…Ñ5…À ¡Í•Ñ¥½¹%Ñ•´¤€ôøÍ•Ñ¥½¹%Ñ•´¹Á…•Ì¹™¥±Ñ•È ¡Á…•%Ñ•´¤€ôø€…Á…•%Ñ•´¹‘•±•Ñ•‘Ð¤¹µ…À ¡Á…•%Ñ•´¤€ôø€¡ì‰½½¬°Í•Ñ¥½¸èÍ•Ñ¥½¹%Ñ•´°Á…”èÁ…•%Ñ•´ô¤¤¤¥ô½¹=Á•¸õí½Á•¹I•ÍÕ±Ñô€¼ùô(€€€€€€€í…Ñ¥Ù•9…Ø€ôôô€‰ÑÉ…Í ˆ€˜˜€ñQÉ…Í¡Y¥•Ü¥Ñ•µÌõíÍÑ…Ñ”¹ÑÉ…Í¡ô½¹I•ÍÑ½É”õíÉ•ÍÑ½É•QÉ…Í¡ô½¹•±•Ñ”õì¡¥¤€ôøÍ•ÑMÑ…Ñ” ¡ÕÉÉ•¹Ð¤€ôø€¡ì€¸¸¹ÕÉÉ•¹Ð°ÑÉ…Í èÕÉÉ•¹Ð¹ÑÉ…Í ¹™¥±Ñ•È ¡•¹ÑÉä¤€ôø•¹ÑÉä¹¥€„ôô¥¤ô¤¥ô½¹µÁÑäõì ¤€ôøì¥˜€¡ÍÑ…Ñ”¹ÑÉ…Í ¹±•¹Ñ €˜˜Ý¥¹‘½Ü¹½¹™¥É´ ‰A…Á¥•É­½Éˆ•¹‘Ÿñ±Ñ¥œ±••É•¸üˆ¤¤Í•ÑMÑ…Ñ” ¡ÕÉÉ•¹Ð¤€ôø€¡ì€¸¸¹ÕÉÉ•¹Ð°ÑÉ…Í èmtô¤¤ìõô€¼ùô(€€€€€€€í…Ñ¥Ù•9…Ø€ôôô€‰Í•ÑÑ¥¹Ìˆ€˜˜€ñM•ÑÑ¥¹ÍY¥•ÜÁÉ½™¥±”õíÁÉ½™¥±•ô½¹AÉ½™¥±”õíÍ•ÑAÉ½™¥±•ôÑ¡•µ”õíÑ¡•µ•ô½¹Q¡•µ”õì¡Ù…±Õ”¤€ôøìÍ•ÑQ¡•µ”¡Ù…±Õ”¤ì±½…±MÑ½É…”¹Í•Ñ%Ñ•´ ‰¹•á„µ¹½Ñ•ÌµÑ¡•µ”ˆ°Ù…±Õ”¤ìõô€¼ùô(€€€€€€ð½µ…¥¸ø((€€€€€íÁ…”€˜˜€ñ9½Ñ•M¥‘•A…¹•°µ½‘”õíÍ¥‘•A…¹•±ôÁ…”õíÁ…•ôÕÉÉ•¹ÑUÍ•ÈõíÁÉ½™¥±•ô½¹±½Í”õì ¤€ôøÍ•ÑM¥‘•A…¹•°¡¹Õ±°¥ô½¹‘‘½µµ•¹Ðõì¡½µµ•¹Ðè9½Ñ•½µµ•¹Ð¤€ôøÕÁ‘…Ñ•A…”¡Á…”¹¥°€¡•¹ÑÉä¤€ôø€¡ì€¸¸¹•¹ÑÉä°½µµ•¹ÑÌèl¸¸¹•¹ÑÉä¹½µµ•¹ÑÌ°½µµ•¹Ñtô¤¥ô½¹Q½±•½µµ•¹Ðõì¡½µµ•¹Ñ%¤€ôøÕÁ‘…Ñ•A…”¡Á…”¹¥°€¡•¹ÑÉä¤€ôø€¡ì€¸¸¹•¹ÑÉä°½µµ•¹ÑÌè•¹ÑÉä¹½µµ•¹ÑÌ¹µ…À ¡½µµ•¹Ð¤€ôø½µµ•¹Ð¹¥€ôôô½µµ•¹Ñ%€üì€¸¸¹½µµ•¹Ð°ÍÑ…ÑÕÌè½µµ•¹Ð¹ÍÑ…ÑÕÌ€ôôô€‰=A8ˆ€ü€‰IM=1Yˆ€è€‰=A8ˆô€è½µµ•¹Ð¤ô¤¥ô½¹I•ÍÑ½É•Y•ÉÍ¥½¸õì¡Ù•ÉÍ¥½¸è9½Ñ•Y•ÉÍ¥½¸¤€ôøìÕÁ‘…Ñ•A…”¡Á…”¹¥°€¡•¹ÑÉä¤€ôø€¡ì€¸¸¹•¹ÑÉä°Ñ¥Ñ±”èÙ•ÉÍ¥½¸¹Ñ¥Ñ±”°½¹Ñ•¹ÐèÙ•ÉÍ¥½¸¹½¹Ñ•¹Ð°ÕÁ‘…Ñ•‘Ðè¹½Ü ¤°ÕÁ‘…Ñ•‘	äèÁÉ½™¥±”ô¤¤ìÍ•ÑM¥‘•A…¹•°¡¹Õ±°¤ìÍ•ÑQ½…ÍÐ ‰Ëñ¡•É”Y•ÉÍ¥½¸ÝÕÉ‘”Ý¥•‘•É¡•É•ÍÑ•±±Ð¸ˆ¤ìõô€¼ùô(€€€€€€ñ5½‰¥±•]½É­ÍÁ…•9…Ø…Ñ¥Ù”õí…Ñ¥Ù•9…Ùô½¹M•±•ÐõíÍ•ÑÑ¥Ù•9…Ùô€¼ø((€€€€€íÍ¡…É•9½Ñ•‰½½¬€˜˜€ñM¡…É•¥…±½œ¹½Ñ•‰½½¬õíÍÑ…Ñ”¹¹½Ñ•‰½½­Ì¹™¥¹ ¡¥Ñ•´¤€ôø¥Ñ•´¹¥€ôôôÍ¡…É•9½Ñ•‰½½¬¹¥¤€üüÍ¡…É•9½Ñ•‰½½­ô•µ…¥°õí¥¹Ù¥Ñ•µ…¥±ôÉ½±”õí¥¹Ù¥Ñ•I½±•ô½¹µ…¥°õíÍ•Ñ%¹Ù¥Ñ•µ…¥±ô½¹I½±”õíÍ•Ñ%¹Ù¥Ñ•I½±•ô½¹MÕ‰µ¥Ðõí¥¹Ù¥Ñ•5•µ‰•Éô½¹±½Í”õì ¤€ôøÍ•ÑM¡…É•9½Ñ•‰½½¬¡¹Õ±°¥ô½¹¡…¹•I½±”õì¡µ•µ‰•É%°É½±”¤€ôøÕÁ‘…Ñ•9½Ñ•‰½½¬¡Í¡…É•9½Ñ•‰½½¬¹¥°€¡¥Ñ•´¤€ôø€¡ì€¸¸¹¥Ñ•´°µ•µ‰•ÉÌè¥Ñ•´¹µ•µ‰•ÉÌ¹µ…À ¡µ•µ‰•È¤€ôøµ•µ‰•È¹¥€ôôôµ•µ‰•É%€üì€¸¸¹µ•µ‰•È°É½±”ô€èµ•µ‰•È¤ô¤¥ô½¹I•µ½Ù”õì¡µ•µ‰•É%¤€ôøÕÁ‘…Ñ•9½Ñ•‰½½¬¡Í¡…É•9½Ñ•‰½½¬¹¥°€¡¥Ñ•´¤€ôø€¡ì€¸¸¹¥Ñ•´°µ•µ‰•ÉÌè¥Ñ•´¹µ•µ‰•ÉÌ¹™¥±Ñ•È ¡µ•µ‰•È¤€ôøµ•µ‰•È¹¥€„ôôµ•µ‰•É%ñðµ•µ‰•È¹É½±”€ôôô€‰=]9Hˆ¤ô¤¥ô€¼ùô(€€€€€íÑ½…ÍÐ€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ý½É­ÍÁ…”µÑ½…ÍÐˆÉ½±”ô‰ÍÑ…ÑÕÌˆøñÍÁ…¸ùíÑ½…ÍÑôð½ÍÁ…¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôøÍ•ÑQ½…ÍÐ ˆˆ¥ô…É¥„µ±…‰•°ô‰!¥¹Ý•¥ÌÍ¡±¥—}•¸ˆøñ`Í¥é”õìÄÕô€¼øð½‰ÕÑÑ½¸øð½‘¥Øùô(€€€€ð½‘¥Øø(€€¤ì)ô()ÑåÁ”I•ÍÕ±Ð€ôì‰½½¬è9½Ñ•‰½½¬ìÍ•Ñ¥½¸èM•Ñ¥½¸ìÁ…”è9½Ñ•A…”ôì()™Õ¹Ñ¥½¸!½µ•Y¥•Ü¡ìÍÑ…Ñ”°½¹=Á•¸°½¹É•…Ñ•9½Ñ•‰½½¬°½¹EÕ¥­9½Ñ”ôèìÍÑ…Ñ”è]½É­ÍÁ…•MÑ…Ñ”ì½¹=Á•¸è€¡É•ÍÕ±ÐèI•ÍÕ±Ð¤€ôøÙ½¥ì½¹É•…Ñ•9½Ñ•‰½½¬è€ ¤€ôøÙ½¥ì½¹EÕ¥­9½Ñ”è€ ¤€ôøÙ½¥ô¤ì(€½¹ÍÐÉ••¹Ð€ôÍÑ…Ñ”¹¹½Ñ•‰½½­Ì¹™±…Ñ5…À ¡‰½½¬¤€ôø‰½½¬¹Í•Ñ¥½¹Ì¹™±…Ñ5…À ¡Í•Ñ¥½¸¤€ôøÍ•Ñ¥½¸¹Á…•Ì¹™¥±Ñ•È ¡Á…”¤€ôø€…Á…”¹‘•±•Ñ•‘Ð¤¹µ…À ¡Á…”¤€ôø€¡ì‰½½¬°Í•Ñ¥½¸°Á…”ô¤¤¤¤¹Í½ÉÐ ¡„°ˆ¤€ôø¹•Ü…Ñ”¡ˆ¹Á…”¹ÕÁ‘…Ñ•‘Ð¤¹•ÑQ¥µ” ¤€´¹•Ü…Ñ”¡„¹Á…”¹ÕÁ‘…Ñ•‘Ð¤¹•ÑQ¥µ” ¤¤¹Í±¥” À°€Ø¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥Ñäµ½¹Ñ•¹Ð¡½µ”µÙ¥•Üˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥Ñäµ¡•É¼ˆøñ‘¥ØøñÍÁ…¸ùÕÑ•¸Q…œð½ÍÁ…¸øñ Äù]…Ì·Ù¡Ñ•ÍÐ‘Ô™•ÍÑ¡…±Ñ•¸üð½ ÄøñÀù•¥¹”Ý¥¡Ñ¥ÍÑ•¸•‘…¹­•¸Õ¹•µ•¥¹Í…µ•¸AÉ½©•­Ñ”…¸•¥¹•´=ÉÐ¸ð½Àøð½‘¥ØøñMÁ…É­±•ÌÍ¥é”õìÐÉô€¼øð½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰¡½µ”µ…Ñ¥½¹Ìˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õí½¹É•…Ñ•9½Ñ•‰½½­ôøñ	½½­=Á•¸Í¥é”õìÈÁô€¼øñÍÑÉ½¹œù9½Ñ¥é‰Õ •ÉÍÑ•±±•¸ð½ÍÑÉ½¹œøñÍÁ…¸ùñÈ•¥¸¹•Õ•ÌQ¡•µ„½‘•ÈAÉ½©•­Ðð½ÍÁ…¸øð½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õí½¹EÕ¥­9½Ñ•ôøñA±ÕÌÍ¥é”õìÈÁô€¼øñÍÑÉ½¹œùM¡¹•±±”9½Ñ¥èð½ÍÑÉ½¹œøñÍÁ…¸ù•‘…¹­•¸Í½™½ÉÐ™•ÍÑ¡…±Ñ•¸ð½ÍÁ…¸øð½‰ÕÑÑ½¸øð½‘¥ØøñÍ•Ñ¥½¸øñ¡•…‘•Èøñ ÈùiÕ±•ÑéÐ‰•…É‰•¥Ñ•Ðð½ Èøð½¡•…‘•Èøñ‘¥Ø±…ÍÍ9…µ”ô‰É•ÍÕ±ÐµÉ¥ˆùíÉ••¹Ð¹µ…À ¡É•ÍÕ±Ð¤€ôø€ñ‰ÕÑÑ½¸­•äõíÉ•ÍÕ±Ð¹Á…”¹¥‘ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹=Á•¸¡É•ÍÕ±Ð¥ôøñÍÁ…¸±…ÍÍ9…µ”ô‰É•ÍÕ±Ðµ½±½ÈˆÍÑå±”õíì‰…­É½Õ¹èÉ•ÍÕ±Ð¹Í•Ñ¥½¸¹½±½Èõô€¼øñÍÑÉ½¹œùíÉ•ÍÕ±Ð¹Á…”¹Ñ¥Ñ±•ôð½ÍÑÉ½¹œøñÀùíÉ•ÍÕ±Ð¹Á…”¹Á±…¥¹Q•áÑ½¹Ñ•¹Ðñð€‰9½ ­•¥¸%¹¡…±Ð‰ôð½ÀøñÍµ…±°ùíÉ•ÍÕ±Ð¹‰½½¬¹¹…µ•ôƒ
Üí™½Éµ…Ñ…Ñ”¡É•ÍÕ±Ð¹Á…”¹ÕÁ‘…Ñ•‘Ð¥ôð½Íµ…±°øð½‰ÕÑÑ½¸ø¥ôð½‘¥Øøð½Í•Ñ¥½¸øð½‘¥Øøì)ô()™Õ¹Ñ¥½¸EÕ¥­9½Ñ•ÍY¥•Ü¡ì¹½Ñ•Ì°Í•±•Ñ•°½¹M•±•Ð°½¹É•…Ñ”°½¹UÁ‘…Ñ”°½¹5½Ù”°½¹•±•Ñ”°½¹ÉÉ½Èôèì¹½Ñ•ÌèEÕ¥­9½Ñ•mtìÍ•±•Ñ•üèEÕ¥­9½Ñ”ì½¹M•±•Ðè€¡¥èÍÑÉ¥¹œ¤€ôøÙ½¥ì½¹É•…Ñ”è€ ¤€ôøÙ½¥ì½¹UÁ‘…Ñ”è€¡ÕÁ‘…Ñ•Èè€¡¥Ñ•´èEÕ¥­9½Ñ”¤€ôøEÕ¥­9½Ñ”¤€ôøÙ½¥ì½¹5½Ù”è€ ¤€ôøÙ½¥ì½¹•±•Ñ”è€¡¥Ñ•´èEÕ¥­9½Ñ”¤€ôøÙ½¥ì½¹ÉÉ½Èè€¡µ•ÍÍ…”èÍÑÉ¥¹œ¤€ôøÙ½¥ô¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÅÕ¥¬µ¹½Ñ•ÌµÙ¥•Üˆøñ…Í¥‘”øñ¡•…‘•Èøñ‘¥ØøñÍÁ…¸ù¥É•­Ð•É™…ÍÍÐð½ÍÁ…¸øñ ÈùM¡¹•±±”9½Ñ¥é•¸ð½ Èøð½‘¥Øøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õí½¹É•…Ñ•ôøñA±ÕÌÍ¥é”õìÄáô€¼øð½‰ÕÑÑ½¸øð½¡•…‘•Èùíl¸¸¹¹½Ñ•Ít¹Í½ÉÐ ¡„°ˆ¤€ôø¹•Ü…Ñ”¡ˆ¹ÕÁ‘…Ñ•‘Ð¤¹•ÑQ¥µ” ¤€´¹•Ü…Ñ”¡„¹ÕÁ‘…Ñ•‘Ð¤¹•ÑQ¥µ” ¤¤¹µ…À ¡¥Ñ•´¤€ôø€ñ‰ÕÑÑ½¸­•äõí¥Ñ•´¹¥‘ô±…ÍÍ9…µ”õí¥Ñ•´¹¥€ôôôÍ•±•Ñ•ü¹¥€ü€‰¥Ìµ…Ñ¥Ù”ˆ€è€ˆ‰ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹M•±•Ð¡¥Ñ•´¹¥¥ôøñÍÑÉ½¹œùí¥Ñ•´¹Ñ¥Ñ±•ôð½ÍÑÉ½¹œøñÀùí¥Ñ•´¹Á±…¥¹Q•áÑ½¹Ñ•¹Ðñð€‰9½ ­•¥¸%¹¡…±Ð‰ôð½ÀøñÍµ…±°ùí™½Éµ…Ñ…Ñ”¡¥Ñ•´¹ÕÁ‘…Ñ•‘Ð¥ôð½Íµ…±°øð½‰ÕÑÑ½¸ø¥ôð½…Í¥‘”ùíÍ•±•Ñ•€ü€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÅÕ¥¬µ•‘¥Ñ½Èˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÅÕ¥¬µÑ¥Ñ±”ˆøñ¥¹ÁÕÐÙ…±Õ”õíÍ•±•Ñ•¹Ñ¥Ñ±•ô…É¥„µ±…‰•°ô‰Q¥Ñ•°‘•ÈÍ¡¹•±±•¸9½Ñ¥èˆ½¹¡…¹”õì¡•Ù•¹Ð¤€ôø½¹UÁ‘…Ñ” ¡¥Ñ•´¤€ôø€¡ì€¸¸¹¥Ñ•´°Ñ¥Ñ±”è•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”°ÕÁ‘…Ñ•‘Ðè¹½Ü ¤ô¤¥ô€¼øñ‘¥Øøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õí½¹5½Ù•ôù%¸9½Ñ¥é‰Õ Ù•ÉÍ¡¥•‰•¸ð½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹•±•Ñ”¡Í•±•Ñ•¥ô…É¥„µ±…‰•°ô‰M¡¹•±±”9½Ñ¥è³ÙÍ¡•¸ˆøñQÉ…Í ÈÍ¥é”õìÄÙô€¼øð½‰ÕÑÑ½¸øð½‘¥Øøð½‘¥ØøñI¥¡Q•áÑ‘¥Ñ½È½¹Ñ•¹ÐõíÍ•±•Ñ•¹½¹Ñ•¹Ñô•‘¥Ñ…‰±”½¹¡…¹”õì¡½¹Ñ•¹Ð°Á±…¥¹Q•áÑ½¹Ñ•¹Ð¤€ôø½¹UÁ‘…Ñ” ¡¥Ñ•´¤€ôø€¡ì€¸¸¹¥Ñ•´°½¹Ñ•¹Ð°Á±…¥¹Q•áÑ½¹Ñ•¹Ð°ÕÁ‘…Ñ•‘Ðè¹½Ü ¤ô¤¥ô½¹ÑÑ…¡µ•¹Ðõì ¤€ôøÕ¹‘•™¥¹•‘ô½¹ÉÉ½Èõí½¹ÉÉ½Éô€¼øð½‘¥Øø€è€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ý½É­ÍÁ…”µ•µÁÑäˆøñA±ÕÌÍ¥é”õìÌÉô€¼øñ Èù9•Õ”Í¡¹•±±”9½Ñ¥èð½ Èøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õí½¹É•…Ñ•ôùÉÍÑ•±±•¸ð½‰ÕÑÑ½¸øð½‘¥Øùôð½‘¥Øøì)ô()™Õ¹Ñ¥½¸M•…É¡Y¥•Ü¡ìÅÕ•Éä°½¹EÕ•Éä°É•ÍÕ±ÑÌ°½¹=Á•¸ôèìÅÕ•ÉäèÍÑÉ¥¹œì½¹EÕ•Éäè€¡Ù…±Õ”èÍÑÉ¥¹œ¤€ôøÙ½¥ìÉ•ÍÕ±ÑÌèI•ÍÕ±Ñmtì½¹=Á•¸è€¡É•ÍÕ±ÐèI•ÍÕ±Ð¤€ôøÙ½¥ô¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥Ñäµ½¹Ñ•¹Ðˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥ÑäµÑ¥Ñ±”ˆøñM•…É Í¥é”õìÈÑô€¼øñ‘¥ØøñÍÁ…¸ù±±•Ì™¥¹‘•¸ð½ÍÁ…¸øñ Äù±½‰…±”MÕ¡”ð½ Äøð½‘¥Øøð½‘¥Øøñ±…‰•°±…ÍÍ9…µ”ô‰±½‰…°µÍ•…É ˆøñM•…É Í¥é”õìÄåô€¼øñ¥¹ÁÕÐ¥ô‰±½‰…°µ¹½Ñ”µÍ•…É ˆÙ…±Õ”õíÅÕ•Éåô½¹¡…¹”õì¡•Ù•¹Ð¤€ôø½¹EÕ•Éä¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‰9½Ñ¥é‹ñ¡•È°M•¥Ñ•¸°%¹¡…±Ñ”°-½µµ•¹Ñ…É”Õ¹¹£‘¹”‘ÕÉ¡ÍÕ¡•¸ƒŠ˜ˆ€¼øð½±…‰•°ùíÅÕ•Éä€˜˜€ñÀ±…ÍÍ9…µ”ô‰É•ÍÕ±Ðµ½Õ¹ÐˆùíÉ•ÍÕ±ÑÌ¹±•¹Ñ¡ôÉ•‰¹¥ÍÍ”ð½Àùôñ‘¥Ø±…ÍÍ9…µ”ô‰Í•…É µÉ•ÍÕ±ÑÌˆùíÉ•ÍÕ±ÑÌ¹µ…À ¡É•ÍÕ±Ð¤€ôø€ñ‰ÕÑÑ½¸­•äõíÉ•ÍÕ±Ð¹Á…”¹¥‘ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹=Á•¸¡É•ÍÕ±Ð¥ôøñÍÁ…¸ÍÑå±”õíì‰…­É½Õ¹èÉ•ÍÕ±Ð¹Í•Ñ¥½¸¹½±½Èõô€¼øñ‘¥ØøñÍÑÉ½¹œùíÉ•ÍÕ±Ð¹Á…”¹Ñ¥Ñ±•ôð½ÍÑÉ½¹œøñÀùíÉ•ÍÕ±Ð¹Á…”¹Á±…¥¹Q•áÑ½¹Ñ•¹Ñôð½ÀøñÍµ…±°ùíÉ•ÍÕ±Ð¹‰½½¬¹¹…µ•ôƒ
ÜíÉ•ÍÕ±Ð¹Í•Ñ¥½¸¹¹…µ•ôð½Íµ…±°øð½‘¥Øøñ¡•ÙÉ½¹I¥¡ÐÍ¥é”õìÄÝô€¼øð½‰ÕÑÑ½¸ø¥ôð½‘¥ØùíÅÕ•Éä€˜˜É•ÍÕ±ÑÌ¹±•¹Ñ €ôôô€À€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ý½É­ÍÁ…”µ•µÁÑäˆøñM•…É Í¥é”õìÌÁô€¼øñ Èù-•¥¹”QÉ•™™•Èð½ ÈøñÀùY•ÉÍÕ¡”•¥¹•¸…¹‘•É•¸MÕ¡‰•É¥™˜¸ð½Àøð½‘¥Øùôð½‘¥Øøì)ô()™Õ¹Ñ¥½¸½±±•Ñ¥½¹Y¥•Ü¡ìÑ¥Ñ±”°¥½¸°•¹ÑÉ¥•Ì°½¹=Á•¸ôèìÑ¥Ñ±”èÍÑÉ¥¹œì¥½¸èI•…Ð¹I•…Ñ9½‘”ì•¹ÑÉ¥•ÌèI•ÍÕ±Ñmtì½¹=Á•¸è€¡É•ÍÕ±ÐèI•ÍÕ±Ð¤€ôøÙ½¥ô¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥Ñäµ½¹Ñ•¹Ðˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥ÑäµÑ¥Ñ±”ˆùí¥½¹ôñ‘¥ØøñÍÁ…¸ù•¥¹”M…µµ±Õ¹œð½ÍÁ…¸øñ ÄùíÑ¥Ñ±•ôð½ Äøð½‘¥Øøð½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰É•ÍÕ±ÐµÉ¥ˆùí•¹ÑÉ¥•Ì¹µ…À ¡É•ÍÕ±Ð¤€ôø€ñ‰ÕÑÑ½¸­•äõíÉ•ÍÕ±Ð¹Á…”¹¥‘ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹=Á•¸¡É•ÍÕ±Ð¥ôøñÍÁ…¸±…ÍÍ9…µ”ô‰É•ÍÕ±Ðµ½±½ÈˆÍÑå±”õíì‰…­É½Õ¹èÉ•ÍÕ±Ð¹Í•Ñ¥½¸¹½±½Èõô€¼øñÍÑÉ½¹œùíÉ•ÍÕ±Ð¹Á…”¹Ñ¥Ñ±•ôð½ÍÑÉ½¹œøñÀùíÉ•ÍÕ±Ð¹Á…”¹Á±…¥¹Q•áÑ½¹Ñ•¹Ðñð€‰9½ ­•¥¸%¹¡…±Ð‰ôð½ÀøñÍµ…±°ùíÉ•ÍÕ±Ð¹‰½½¬¹¹…µ•ôƒ
ÜíÉ•ÍÕ±Ð¹Í•Ñ¥½¸¹¹…µ•ôð½Íµ…±°øð½‰ÕÑÑ½¸ø¥ôð½‘¥Øùí•¹ÑÉ¥•Ì¹±•¹Ñ €ôôô€À€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ý½É­ÍÁ…”µ•µÁÑäˆøñMÑ…ÈÍ¥é”õìÌÁô€¼øñ Èù9½ ­•¥¹”¥¹ÑË‘”ð½ Èøð½‘¥Øùôð½‘¥Øøì)ô()™Õ¹Ñ¥½¸…Ù½É¥Ñ•ÍY¥•Ü¡ì¹½Ñ•‰½½­Ì°½¹=Á•¸°½¹=Á•¹9½Ñ•‰½½¬ôèì¹½Ñ•‰½½­Ìè9½Ñ•‰½½­mtì½¹=Á•¸è€¡É•ÍÕ±ÐèI•ÍÕ±Ð¤€ôøÙ½¥ì½¹=Á•¹9½Ñ•‰½½¬è€¡¥èÍÑÉ¥¹œ¤€ôøÙ½¥ô¤ì(€½¹ÍÐ™…Ù½É¥Ñ•	½½­Ì€ô¹½Ñ•‰½½­Ì¹™¥±Ñ•È ¡‰½½¬¤€ôø‰½½¬¹¥Í…Ù½É¥Ñ”€˜˜€…‰½½¬¹‘•±•Ñ•‘Ð¤ì(€½¹ÍÐ™…Ù½É¥Ñ•M•Ñ¥½¹Ì€ô¹½Ñ•‰½½­Ì¹™±…Ñ5…À ¡‰½½¬¤€ôø‰½½¬¹Í•Ñ¥½¹Ì¹™¥±Ñ•È ¡Í•Ñ¥½¸¤€ôøÍ•Ñ¥½¸¹¥Í…Ù½É¥Ñ”€˜˜€…Í•Ñ¥½¸¹‘•±•Ñ•‘Ð¤¹µ…À ¡Í•Ñ¥½¸¤€ôø€¡ì‰½½¬°Í•Ñ¥½¸ô¤¤¤ì(€½¹ÍÐ™…Ù½É¥Ñ•A…•Ì€ô¹½Ñ•‰½½­Ì¹™±…Ñ5…À ¡‰½½¬¤€ôø‰½½¬¹Í•Ñ¥½¹Ì¹™±…Ñ5…À ¡Í•Ñ¥½¸¤€ôøÍ•Ñ¥½¸¹Á…•Ì¹™¥±Ñ•È ¡Á…”¤€ôøÁ…”¹¥Í…Ù½É¥Ñ”€˜˜€…Á…”¹‘•±•Ñ•‘Ð¤¹µ…À ¡Á…”¤€ôø€¡ì‰½½¬°Í•Ñ¥½¸°Á…”ô¤¤¤¤ì(€½¹ÍÐ•µÁÑä€ô€…™…Ù½É¥Ñ•	½½­Ì¹±•¹Ñ €˜˜€…™…Ù½É¥Ñ•M•Ñ¥½¹Ì¹±•¹Ñ €˜˜€…™…Ù½É¥Ñ•A…•Ì¹±•¹Ñ ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥Ñäµ½¹Ñ•¹Ðˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥ÑäµÑ¥Ñ±”ˆøñMÑ…ÈÍ¥é”õìÈÑô€¼øñ‘¥ØøñÍÁ…¸ù•¥¹”M…µµ±Õ¹œð½ÍÁ…¸øñ Äù…Ù½É¥Ñ•¸ð½ Äøð½‘¥Øøð½‘¥Øùí™…Ù½É¥Ñ•	½½­Ì¹±•¹Ñ €ø€À€˜˜€ðøñ È±…ÍÍ9…µ”ô‰½±±•Ñ¥½¸µ¡•…‘¥¹œˆù9½Ñ¥é‹ñ¡•Èð½ Èøñ‘¥Ø±…ÍÍ9…µ”ô‰É•ÍÕ±ÐµÉ¥ˆùí™…Ù½É¥Ñ•	½½­Ì¹µ…À ¡‰½½¬¤€ôø€ñ‰ÕÑÑ½¸­•äõí‰½½¬¹¥‘ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹=Á•¹9½Ñ•‰½½¬¡‰½½¬¹¥¥ôøñÍÁ…¸±…ÍÍ9…µ”ô‰É•ÍÕ±Ðµ½±½ÈˆÍÑå±”õíì‰…­É½Õ¹è‰½½¬¹½±½Èõô€¼øñÍÑÉ½¹œùí‰½½¬¹¹…µ•ôð½ÍÑÉ½¹œøñÀùí‰½½¬¹‘•ÍÉ¥ÁÑ¥½¸ñð€‰9½Ñ¥é‰Õ ‰ôð½ÀøñÍµ…±°ùí‰½½¬¹Í•Ñ¥½¹Ì¹±•¹Ñ¡ô‰Í¡¹¥ÑÑ”ð½Íµ…±°øð½‰ÕÑÑ½¸ø¥ôð½‘¥Øøð¼ùõí™…Ù½É¥Ñ•M•Ñ¥½¹Ì¹±•¹Ñ €ø€À€˜˜€ðøñ È±…ÍÍ9…µ”ô‰½±±•Ñ¥½¸µ¡•…‘¥¹œˆù‰Í¡¹¥ÑÑ”ð½ Èøñ‘¥Ø±…ÍÍ9…µ”ô‰É•ÍÕ±ÐµÉ¥ˆùí™…Ù½É¥Ñ•M•Ñ¥½¹Ì¹µ…À ¡ì‰½½¬°Í•Ñ¥½¸ô¤€ôø€ñ‰ÕÑÑ½¸­•äõíÍ•Ñ¥½¸¹¥‘ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôøì½¹ÍÐ™¥ÉÍÐ€ôÍ•Ñ¥½¸¹Á…•Ì¹™¥¹ ¡Á…”¤€ôø€…Á…”¹‘•±•Ñ•‘Ð¤ì¥˜€¡™¥ÉÍÐ¤½¹=Á•¸¡ì‰½½¬°Í•Ñ¥½¸°Á…”è™¥ÉÍÐô¤ì•±Í”½¹=Á•¹9½Ñ•‰½½¬¡‰½½¬¹¥¤ìõôøñÍÁ…¸±…ÍÍ9…µ”ô‰É•ÍÕ±Ðµ½±½ÈˆÍÑå±”õíì‰…­É½Õ¹èÍ•Ñ¥½¸¹½±½Èõô€¼øñÍÑÉ½¹œùíÍ•Ñ¥½¸¹¹…µ•ôð½ÍÑÉ½¹œøñÀùí‰½½¬¹¹…µ•ôð½ÀøñÍµ…±°ùíÍ•Ñ¥½¸¹Á…•Ì¹±•¹Ñ¡ôM•¥Ñ•¸ð½Íµ…±°øð½‰ÕÑÑ½¸ø¥ôð½‘¥Øøð¼ùõí™…Ù½É¥Ñ•A…•Ì¹±•¹Ñ €ø€À€˜˜€ðøñ È±…ÍÍ9…µ”ô‰½±±•Ñ¥½¸µ¡•…‘¥¹œˆùM•¥Ñ•¸ð½ Èøñ‘¥Ø±…ÍÍ9…µ”ô‰É•ÍÕ±ÐµÉ¥ˆùí™…Ù½É¥Ñ•A…•Ì¹µ…À ¡É•ÍÕ±Ð¤€ôø€ñ‰ÕÑÑ½¸­•äõíÉ•ÍÕ±Ð¹Á…”¹¥‘ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹=Á•¸¡É•ÍÕ±Ð¥ôøñÍÁ…¸±…ÍÍ9…µ”ô‰É•ÍÕ±Ðµ½±½ÈˆÍÑå±”õíì‰…­É½Õ¹èÉ•ÍÕ±Ð¹Í•Ñ¥½¸¹½±½Èõô€¼øñÍÑÉ½¹œùíÉ•ÍÕ±Ð¹Á…”¹Ñ¥Ñ±•ôð½ÍÑÉ½¹œøñÀùíÉ•ÍÕ±Ð¹Á…”¹Á±…¥¹Q•áÑ½¹Ñ•¹Ðñð€‰9½ ­•¥¸%¹¡…±Ð‰ôð½ÀøñÍµ…±°ùíÉ•ÍÕ±Ð¹‰½½¬¹¹…µ•ôƒ
ÜíÉ•ÍÕ±Ð¹Í•Ñ¥½¸¹¹…µ•ôð½Íµ…±°øð½‰ÕÑÑ½¸ø¥ôð½‘¥Øøð¼ùõí•µÁÑä€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ý½É­ÍÁ…”µ•µÁÑäˆøñMÑ…ÈÍ¥é”õìÌÁô€¼øñ Èù9½ ­•¥¹”…Ù½É¥Ñ•¸ð½ Èøð½‘¥Øùôð½‘¥Øøì)ô()™Õ¹Ñ¥½¸QÉ…Í¡Y¥•Ü¡ì¥Ñ•µÌ°½¹I•ÍÑ½É”°½¹•±•Ñ”°½¹µÁÑäôèì¥Ñ•µÌèQÉ…Í¡%Ñ•µmtì½¹I•ÍÑ½É”è€¡¥Ñ•´èQÉ…Í¡%Ñ•´¤€ôøÙ½¥ì½¹•±•Ñ”è€¡¥èÍÑÉ¥¹œ¤€ôøÙ½¥ì½¹µÁÑäè€ ¤€ôøÙ½¥ô¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥Ñäµ½¹Ñ•¹Ðˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥ÑäµÑ¥Ñ±”µÉ½Üˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥ÑäµÑ¥Ñ±”ˆøñQÉ…Í ÈÍ¥é”õìÈÑô€¼øñ‘¥ØøñÍÁ…¸øÌÀQ…”…Õ™‰•Ý…¡ÉÐð½ÍÁ…¸øñ ÄùA…Á¥•É­½Éˆð½ Äøð½‘¥Øøð½‘¥Øøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õí½¹µÁÑåô‘¥Í…‰±•õì…¥Ñ•µÌ¹±•¹Ñ¡ôùA…Á¥•É­½Éˆ±••É•¸ð½‰ÕÑÑ½¸øð½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰ÑÉ…Í µ±¥ÍÐˆùí¥Ñ•µÌ¹µ…À ¡¥Ñ•´¤€ôø€ñ…ÉÑ¥±”­•äõí€‘í¥Ñ•´¹ÑåÁ•ô´‘í¥Ñ•´¹¥‘õôøñ‘¥ØøñÍÑÉ½¹œùí¥Ñ•´¹Ñ¥Ñ±•ôð½ÍÑÉ½¹œøñÍÁ…¸ùí¥Ñ•´¹ÑåÁ”€ôôô€‰¹½Ñ•‰½½¬ˆ€ü€‰9½Ñ¥é‰Õ ˆ€è¥Ñ•´¹ÑåÁ”€ôôô€‰Í•Ñ¥½¸ˆ€ü€‰‰Í¡¹¥ÑÐˆ€è¥Ñ•´¹ÑåÁ”€ôôô€‰Á…”ˆ€ü€‰M•¥Ñ”ˆ€è€‰M¡¹•±±”9½Ñ¥è‰ôƒ
Ü•³ÙÍ¡Ðí™½Éµ…Ñ…Ñ”¡¥Ñ•´¹‘•±•Ñ•‘Ð¥ôð½ÍÁ…¸øð½‘¥Øøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹I•ÍÑ½É”¡¥Ñ•´¥ôù]¥•‘•É¡•ÉÍÑ•±±•¸ð½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôøì¥˜€¡Ý¥¹‘½Ü¹½¹™¥É´ ‰¥•Í•Ì±•µ•¹Ð•¹‘Ÿñ±Ñ¥œ³ÙÍ¡•¸üˆ¤¤½¹•±•Ñ”¡¥Ñ•´¹¥¤ìõôøñQÉ…Í ÈÍ¥é”õìÄÕô€¼ø¹‘Ÿñ±Ñ¥œ³ÙÍ¡•¸ð½‰ÕÑÑ½¸øð½…ÉÑ¥±”ø¥ôð½‘¥Øùì…¥Ñ•µÌ¹±•¹Ñ €˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ý½É­ÍÁ…”µ•µÁÑäˆøñQÉ…Í ÈÍ¥é”õìÌÉô€¼øñ Èù•ÈA…Á¥•É­½Éˆ¥ÍÐ±••Èð½ Èøð½‘¥Øùôð½‘¥Øøì)ô()™Õ¹Ñ¥½¸M•ÑÑ¥¹ÍY¥•Ü¡ìÁÉ½™¥±”°½¹AÉ½™¥±”°Ñ¡•µ”°½¹Q¡•µ”ôèìÁÉ½™¥±”è]½É­ÍÁ…•UÍ•Èì½¹AÉ½™¥±”è€¡ÕÍ•Èè]½É­ÍÁ…•UÍ•È¤€ôøÙ½¥ìÑ¡•µ”è€‰±¥¡Ðˆð€‰‘…É¬ˆð€‰ÍåÍÑ•´ˆì½¹Q¡•µ”è€¡Ñ¡•µ”è€‰±¥¡Ðˆð€‰‘…É¬ˆð€‰ÍåÍÑ•´ˆ¤€ôøÙ½¥ô¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥Ñäµ½¹Ñ•¹ÐÍ•ÑÑ¥¹ÌµÙ¥•Üˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÕÑ¥±¥ÑäµÑ¥Ñ±”ˆøñM•ÑÑ¥¹ÌÍ¥é”õìÈÑô€¼øñ‘¥ØøñÍÁ…¸ùA•ÉÏÙ¹±¥¡•È	•É•¥ ð½ÍÁ…¸øñ Äù¥¹ÍÑ•±±Õ¹•¸ð½ Äøð½‘¥Øøð½‘¥ØøñÍ•Ñ¥½¸øñ ÈùAÉ½™¥°ð½ Èøñ‘¥Ø±…ÍÍ9…µ”ô‰ÁÉ½™¥±”µÍ•ÑÑ¥¹ÌˆøñÍÁ…¸±…ÍÍ9…µ”ô‰Í•ÑÑ¥¹Ìµ…Ù…Ñ…ÈˆùíÁÉ½™¥±”¹¹…µ”¹Í±¥” À°€È¤¹Ñ½UÁÁ•É…Í” ¥ôð½ÍÁ…¸øñ±…‰•°ù9…µ”ñ¥¹ÁÕÐÙ…±Õ”õíÁÉ½™¥±”¹¹…µ•ô½¹¡…¹”õì¡•Ù•¹Ð¤€ôø½¹AÉ½™¥±”¡ì€¸¸¹ÁÉ½™¥±”°¹…µ”è•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”ô¥ô€¼øð½±…‰•°øñ±…‰•°ùµ5…¥°ñ¥¹ÁÕÐÙ…±Õ”õíÁÉ½™¥±”¹•µ…¥±ô‘¥Í…‰±•€¼øð½±…‰•°øð½‘¥Øøð½Í•Ñ¥½¸øñÍ•Ñ¥½¸øñ Èù…ÉÍÑ•±±Õ¹œð½ Èøñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ¡•µ”µ½ÁÑ¥½¹Ìˆøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÑ¡•µ”€ôôô€‰±¥¡Ðˆ€ü€‰¥Ìµ…Ñ¥Ù”ˆ€è€ˆ‰ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹Q¡•µ” ‰±¥¡Ðˆ¥ôøñMÕ¸Í¥é”õìÈÁô€¼ø!•±°ð½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÑ¡•µ”€ôôô€‰‘…É¬ˆ€ü€‰¥Ìµ…Ñ¥Ù”ˆ€è€ˆ‰ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹Q¡•µ” ‰‘…É¬ˆ¥ôøñ5½½¸Í¥é”õìÈÁô€¼øÕ¹­•°ð½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÑ¡•µ”€ôôô€‰ÍåÍÑ•´ˆ€ü€‰¥Ìµ…Ñ¥Ù”ˆ€è€ˆ‰ôÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹Q¡•µ” ‰ÍåÍÑ•´ˆ¥ôøñM•ÑÑ¥¹ÌÍ¥é”õìÈÁô€¼øMåÍÑ•´ð½‰ÕÑÑ½¸øð½‘¥Øøð½Í•Ñ¥½¸øð½‘¥Øøì)ô()™Õ¹Ñ¥½¸M¡…É•¥…±½œ¡ì¹½Ñ•‰½½¬°•µ…¥°°É½±”°½¹µ…¥°°½¹I½±”°½¹MÕ‰µ¥Ð°½¹±½Í”°½¹¡…¹•I½±”°½¹I•µ½Ù”ôèì¹½Ñ•‰½½¬è9½Ñ•‰½½¬ì•µ…¥°èÍÑÉ¥¹œìÉ½±”è5•µ‰•ÉI½±”ì½¹µ…¥°è€¡Ù…±Õ”èÍÑÉ¥¹œ¤€ôøÙ½¥ì½¹I½±”è€¡Ù…±Õ”è5•µ‰•ÉI½±”¤€ôøÙ½¥ì½¹MÕ‰µ¥Ðè€¡•Ù•¹ÐèI•…Ð¹½ÉµÙ•¹Ð¤€ôøÙ½¥ì½¹±½Í”è€ ¤€ôøÙ½¥ì½¹¡…¹•I½±”è€¡µ•µ‰•É%èÍÑÉ¥¹œ°É½±”è5•µ‰•ÉI½±”¤€ôøÙ½¥ì½¹I•µ½Ù”è€¡µ•µ‰•É%èÍÑÉ¥¹œ¤€ôøÙ½¥ô¤ì(€É•ÑÕÉ¸€ñ‘¥Ø±…ÍÍ9…µ”ô‰‘¥…±½œµ‰…­‘É½ÀˆÉ½±”ô‰ÁÉ•Í•¹Ñ…Ñ¥½¸ˆ½¹5½ÕÍ•½Ý¸õì¡•Ù•¹Ð¤€ôøì¥˜€¡•Ù•¹Ð¹Ñ…É•Ð€ôôô•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¤½¹±½Í” ¤ìõôøñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰Í¡…É”µ‘¥…±½œˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆ…É¥„µ±…‰•±±•‘‰äô‰Í¡…É”µÑ¥Ñ±”ˆøñ¡•…‘•Èøñ‘¥ØøñM¡…É”ÈÍ¥é”õìÈÁô€¼øñ‘¥ØøñÍÁ…¸ùiÕÍ…µµ•¹…É‰•¥Ñ•¸ð½ÍÁ…¸øñ È¥ô‰Í¡…É”µÑ¥Ñ±”ˆûŠyí¹½Ñ•‰½½¬¹¹…µ•÷ŠpÑ•¥±•¸ð½ Èøð½‘¥Øøð½‘¥Øøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õí½¹±½Í•ô…É¥„µ±…‰•°ô‰¥…±½œÍ¡±¥—}•¸ˆøñ`Í¥é”õìÄåô€¼øð½‰ÕÑÑ½¸øð½¡•…‘•Èøñ™½É´½¹MÕ‰µ¥Ðõí½¹MÕ‰µ¥Ñôøñ±…‰•°øñÍÁ…¸ùµ5…¥°µ‘É•ÍÍ”ð½ÍÁ…¸øñ¥¹ÁÕÐÑåÁ”ô‰•µ…¥°ˆÉ•ÅÕ¥É•Ù…±Õ”õí•µ…¥±ô½¹¡…¹”õì¡•Ù•¹Ð¤€ôø½¹µ…¥°¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‰¹…µ•‰•¥ÍÁ¥•°¹‘”ˆ€¼øð½±…‰•°øñ±…‰•°øñÍÁ…¸ù	•É•¡Ñ¥Õ¹œð½ÍÁ…¸øñÍ•±•ÐÙ…±Õ”õíÉ½±•ô½¹¡…¹”õì¡•Ù•¹Ð¤€ôø½¹I½±”¡•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”…Ì5•µ‰•ÉI½±”¥ôøñ½ÁÑ¥½¸Ù…±Õ”ô‰%Q=Hˆù	•…É‰•¥Ñ•Èð½½ÁÑ¥½¸øñ½ÁÑ¥½¸Ù…±Õ”ô‰=559QHˆù-½µµ•¹Ñ…Ñ½Èð½½ÁÑ¥½¸øñ½ÁÑ¥½¸Ù…±Õ”ô‰Y%]Hˆù9ÕÈ±•Í•¸ð½½ÁÑ¥½¸øð½Í•±•Ðøð½±…‰•°øñ‰ÕÑÑ½¸ÑåÁ”ô‰ÍÕ‰µ¥Ðˆù¥¹±…‘•¸ð½‰ÕÑÑ½¸øð½™½É´øñ‘¥Ø±…ÍÍ9…µ”ô‰µ•µ‰•Èµ±¥ÍÐˆøñ ÌùA•ÉÍ½¹•¸µ¥ÐiÕÉ¥™˜ð½ Ìùí¹½Ñ•‰½½¬¹µ•µ‰•ÉÌ¹µ…À ¡µ•µ‰•È¤€ôø€ñ…ÉÑ¥±”­•äõíµ•µ‰•È¹¥‘ôøñÍÁ…¸±…ÍÍ9…µ”ô‰µ•µ‰•Èµ…Ù…Ñ…Èˆùíµ•µ‰•È¹ÕÍ•È¹¹…µ”¹Í±¥” À°€È¤¹Ñ½UÁÁ•É…Í” ¥ôð½ÍÁ…¸øñ‘¥ØøñÍÑÉ½¹œùíµ•µ‰•È¹ÕÍ•È¹¹…µ•ôð½ÍÑÉ½¹œøñÍµ…±°ùíµ•µ‰•È¹ÕÍ•È¹•µ…¥±ôƒ
ÜéÕ±•ÑéÐ…­Ñ¥Øí™½Éµ…Ñ…Ñ”¡µ•µ‰•È¹±…ÍÑÑ¥Ù•Ð¥ôð½Íµ…±°øð½‘¥Øùíµ•µ‰•È¹É½±”€ôôô€‰=]9Hˆ€ü€ñÍÁ…¸±…ÍÍ9…µ”ô‰½Ý¹•Èµ±…‰•°ˆù	•Í¥Ñé•Èð½ÍÁ…¸ø€è€ðøñÍ•±•Ð…É¥„µ±…‰•°õí	•É•¡Ñ¥Õ¹œ›ñÈ€‘íµ•µ‰•È¹ÕÍ•È¹¹…µ•õôÙ…±Õ”õíµ•µ‰•È¹É½±•ô½¹¡…¹”õì¡•Ù•¹Ð¤€ôø½¹¡…¹•I½±”¡µ•µ‰•È¹¥°•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”…Ì5•µ‰•ÉI½±”¥ôøñ½ÁÑ¥½¸Ù…±Õ”ô‰%Q=Hˆù	•…É‰•¥Ñ•Èð½½ÁÑ¥½¸øñ½ÁÑ¥½¸Ù…±Õ”ô‰=559QHˆù-½µµ•¹Ñ…Ñ½Èð½½ÁÑ¥½¸øñ½ÁÑ¥½¸Ù…±Õ”ô‰Y%]Hˆù9ÕÈ±•Í•¸ð½½ÁÑ¥½¸øð½Í•±•Ðøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôø½¹I•µ½Ù”¡µ•µ‰•È¹¥¥ô…É¥„µ±…‰•°õí€‘íµ•µ‰•È¹ÕÍ•È¹¹…µ•ô•¹Ñ™•É¹•¹ôøñ`Í¥é”õìÄÕô€¼øð½‰ÕÑÑ½¸øð¼ùôð½…ÉÑ¥±”ø¥ôð½‘¥Øøð½Í•Ñ¥½¸øð½‘¥Øøì)ô