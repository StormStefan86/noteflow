import type { Notebook, WorkspaceState, WorkspaceUser } from "../types/notes";

const now = new Date();
const iso = (minutesAgo = 0) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();

export function createDemoWorkspace(user: WorkspaceUser): WorkspaceState {
  const collaborator: WorkspaceUser = {
    id: "demo-collaborator",
    name: "Mara Hoffmann",
    email: "mara@example.com",
  };

  const notebook: Notebook = {
    id: "notebook-welcome",
    name: "Mein erstes Notizbuch",
    description: "Gedanken, Aufgaben und Ideen an einem ruhigen Ort.",
    color: "#7567d8",
    ownerId: user.id,
    isFavorite: true,
    createdAt: iso(14_400),
    updatedAt: iso(2),
    members: [
      { id: "member-owner", user, role: "OWNER", lastActiveAt: iso(0) },
      { id: "member-mara", user: collaborator, role: "EDITOR", lastActiveAt: iso(4) },
    ],
    sections: [
      {
        id: "section-general",
        name: "Allgemein",
        color: "#7567d8",
        position: 0,
        isFavorite: true,
        createdAt: iso(14_400),
        updatedAt: iso(2),
        pages: [
          {
            id: "page-welcome",
            title: "Willkommen bei Nexa Notes",
            content:
              '<h2>Schön, dass du da bist.</h2><p>Dieser Bereich ist dein ruhiger Ort für Gedanken, Projekte und gemeinsame Arbeit.</p><blockquote><p>Tipp: Mit <strong>Strg + Umschalt + N</strong> erstellst du jederzeit eine schnelle Notiz.</p></blockquote><h3>Deine ersten Schritte</h3><ul><li><p>Erstelle ein neues Notizbuch</p></li><li><p>Ordne Inhalte in Abschnitten</p></li><li><p>Teile wichtige Seiten mit deinem Team</p></li></ul>',
            plainTextContent: "Schön, dass du da bist. Dein ruhiger Ort für Gedanken, Projekte und gemeinsame Arbeit.",
            position: 0,
            isFavorite: true,
            isShared: true,
            createdBy: user,
            updatedBy: collaborator,
            createdAt: iso(14_400),
            updatedAt: iso(2),
            comments: [
              {
                id: "comment-welcome",
                author: collaborator,
                content: "Die Aufgabenliste können wir später gemeinsam ergänzen.",
                status: "OPEN",
                createdAt: iso(18),
              },
            ],
            versions: [],
            attachments: [],
          },
          {
            id: "page-meeting",
            title: "Team-Meeting · Juli",
            content: '<h2>Agenda</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Projektstatus</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Nächste Meilensteine</p></div></li></ul>',
            plainTextContent: "Agenda Projektstatus Nächste Meilensteine",
            position: 1,
            isFavorite: false,
            isShared: true,
            createdBy: user,
            updatedBy: user,
            createdAt: iso(2_800),
            updatedAt: iso(95),
            comments: [],
            versions: [],
            attachments: [],
          },
        ],
      },
      {
        id: "section-tasks",
        name: "Aufgaben",
        color: "#4eb7b6",
        position: 1,
        isFavorite: false,
        createdAt: iso(12_000),
        updatedAt: iso(120),
        pages: [
          {
            id: "page-tasks",
            title: "Meine Aufgaben",
            content: '<h2>Diese Woche</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Konzept finalisieren</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Feedback einholen</p></div></li></ul>',
            plainTextContent: "Diese Woche Konzept finalisieren Feedback einholen",
            position: 0,
            isFavorite: false,
            createdBy: user,
            updatedBy: user,
            createdAt: iso(8_000),
            updatedAt: iso(120),
            comments: [],
            versions: [],
            attachments: [],
          },
        ],
      },
      {
        id: "section-ideas",
        name: "Ideen",
        color: "#ef9e66",
        position: 2,
        isFavorite: false,
        createdAt: iso(10_000),
        updatedAt: iso(640),
        pages: [],
      },
    ],
  };

  return {
    notebooks: [notebook],
    quickNotes: [
      {
        id: "quick-first",
        title: "Gedanke für später",
        content: "<p>Eine übersichtliche Startseite mit den zuletzt bearbeiteten Notizen.</p>",
        plainTextContent: "Eine übersichtliche Startseite mit den zuletzt bearbeiteten Notizen.",
        createdAt: iso(300),
        updatedAt: iso(300),
      },
    ],
    trash: [],
  };
}
