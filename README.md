# Nexa Notes

Nexa Notes ist eine moderne, responsive Anwendung für persönliche und gemeinsam bearbeitete Notizbücher. Der vorhandene Nexa-Login führt direkt in einen ruhigen Vier-Bereiche-Arbeitsplatz mit Notizbüchern, Abschnitten, Seitenliste und Tiptap-Editor.

## Architektur

- **Oberfläche:** Next.js App Router, React, TypeScript und Tailwind CSS
- **Editor:** Tiptap mit modularen Erweiterungen für Textformatierung, Listen, Checklisten, Tabellen, Links, Bilder und Codeblöcke
- **Datenzugriff:** TanStack Query als Client-Schicht; Zod validiert Formulare und API-Eingaben
- **Datenbank:** PostgreSQL mit Prisma ORM
- **Authentifizierung:** Auth.js mit Credentials-Anmeldung, Prisma-Adapter und bcrypt-Passwort-Hashes
- **Zusammenarbeit:** Supabase Realtime für Anwesenheit und Live-Updates; `BroadcastChannel` dient lokal als sofort nutzbarer Ersatz
- **Dateien:** Cloudinary für produktive Uploads; lokal werden Dateien als Offline-Entwurf im Browser gehalten
- **Offline:** verzögerter Autosave, lokaler Cache, Online-/Offline-Erkennung und erneute Synchronisierung

## Ordnerstruktur

```text
app/
  api/                         Geschützte Auth-, Notizbuch-, Seiten- und Upload-Routen
  generated/prisma/            Generierter Prisma-Client
  globals.css                  Login-Grunddesign
  notebook.css                 Responsiver Notiz-Arbeitsplatz
  layout.tsx                   Metadaten und globale Provider
  page.tsx                     Login und Übergang zum Workspace
components/notes/
  EditorToolbar.tsx            Kompakte, funktionale Formatierungsleiste
  RichTextEditor.tsx           Tiptap-Editor und Bild-/Zwischenablage-Handling
  NotesWorkspace.tsx           Zustands- und Anwendungslogik
  WorkspaceSidebar.tsx         Hauptnavigation, Notizbücher und Abschnitte
  PageList.tsx                 Seitenübersicht und Seitenaktionen
  NoteSidePanel.tsx            Kommentare und Versionsverlauf
hooks/
  use-realtime-note.ts         Supabase-/Browser-Echtzeitkanal und Anwesenheit
lib/
  access.ts                    Serverseitige Berechtigungsprüfung
  demo-notes.ts                Beispieldaten für lokale Entwicklung
  prisma.ts                    PostgreSQL-Verbindung
  validation.ts                Zod-Schemas
prisma/
  schema.prisma                Vollständiges relationales Datenmodell
  seed.ts                      Beispielbenutzer und Beispielnotizbuch
types/
  notes.ts                     Domänentypen
  next-auth.d.ts               Auth.js-Typerweiterung
tests/
  rendered-html.test.mjs       Struktur- und Funktionsprüfungen
```

## Lokal starten

Am einfachsten in Visual Studio Code:

1. **Terminal → Aufgabe ausführen…** öffnen.
2. **Nexa Login starten** auswählen.
3. Im Browser [http://127.0.0.1:3000](http://127.0.0.1:3000) öffnen.

Alternativ im Terminal:

```powershell
pnpm install
pnpm dev
```

Die lokale Vorschau funktioniert auch ohne PostgreSQL. Registrierung, Notizen und Offline-Entwürfe werden dann nur in diesem Browser gespeichert. Für den produktiven Mehrbenutzerbetrieb ist die Datenbankkonfiguration erforderlich.

## PostgreSQL und Auth.js einrichten

1. `.env.example` als `.env` kopieren.
2. `DATABASE_URL` auf eine PostgreSQL-Datenbank setzen.
3. Einen langen zufälligen Wert für `AUTH_SECRET` eintragen.
4. Schema anwenden und Beispieldaten anlegen:

```powershell
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Der Seed-Benutzer lautet `demo@nexa-notes.local`; das lokale Demo-Passwort steht ausschließlich in `prisma/seed.ts` und sollte außerhalb der Entwicklung geändert werden.

## Echtzeit und Uploads

Für Zusammenarbeit zwischen verschiedenen Geräten die Supabase-Werte in `.env` eintragen. Ohne diese Werte synchronisiert die App Änderungen zwischen Tabs desselben Browsers. Für dauerhafte Bild- und Dateiuploads werden die drei Cloudinary-Werte benötigt; ohne sie arbeitet der Editor mit lokalen Offline-Dateien.

## Tastenkombinationen

- `Strg/Cmd + B` – Fett
- `Strg/Cmd + I` – Kursiv
- `Strg/Cmd + U` – Unterstrichen
- `Strg/Cmd + K` – Link
- `Strg/Cmd + Z` – Rückgängig
- `Strg/Cmd + Umschalt + Z` – Wiederholen
- `Strg/Cmd + S` – sofort speichern
- `Strg/Cmd + F` – globale Suche
- `Strg/Cmd + N` – neue Notizseite
- `Strg/Cmd + Umschalt + N` – schnelle Notiz

## Qualität prüfen

```powershell
pnpm test
pnpm lint
```

`pnpm test` erstellt zuerst einen vollständigen Produktions-Build und prüft anschließend Login-Verknüpfung, Editor-Funktionen, Datenmodell, Authentifizierung und Validierung.
