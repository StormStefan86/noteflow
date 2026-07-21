export type MemberRole = "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER";
export type CommentStatus = "OPEN" | "RESOLVED";
export type SaveStatus = "saved" | "saving" | "offline" | "error";

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
};

export type NotebookMember = {
  id: string;
  user: WorkspaceUser;
  role: MemberRole;
  lastActiveAt: string;
};

export type NoteComment = {
  id: string;
  author: WorkspaceUser;
  content: string;
  status: CommentStatus;
  parentCommentId?: string;
  createdAt: string;
};

export type NoteVersion = {
  id: string;
  title: string;
  content: string;
  createdBy: WorkspaceUser;
  createdAt: string;
};

export type Attachment = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type NotePage = {
  id: string;
  title: string;
  content: string;
  plainTextContent: string;
  position: number;
  isFavorite: boolean;
  isShared?: boolean;
  createdBy: WorkspaceUser;
  updatedBy: WorkspaceUser;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  comments: NoteComment[];
  versions: NoteVersion[];
  attachments: Attachment[];
};

export type Section = {
  id: string;
  name: string;
  color: string;
  position: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  pages: NotePage[];
};

export type Notebook = {
  id: string;
  name: string;
  description: string;
  color: string;
  ownerId: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  members: NotebookMember[];
  sections: Section[];
};

export type QuickNote = {
  id: string;
  title: string;
  content: string;
  plainTextContent: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type TrashItem = {
  id: string;
  type: "notebook" | "section" | "page" | "quick-note";
  title: string;
  deletedAt: string;
  payload: unknown;
  parentId?: string;
  notebookId?: string;
};

export type WorkspaceState = {
  notebooks: Notebook[];
  quickNotes: QuickNote[];
  trash: TrashItem[];
};
