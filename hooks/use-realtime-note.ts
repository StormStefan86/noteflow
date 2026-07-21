"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceUser } from "../types/notes";

export type RealtimeNoteUpdate = {
  id: string;
  title: string;
  content: string;
  plainTextContent: string;
  updatedAt: string;
  updatedBy: WorkspaceUser;
};

export type ActiveEditor = WorkspaceUser & { lastActiveAt: string };

export function useRealtimeNote(
  noteId: string | undefined,
  user: WorkspaceUser,
  onRemoteUpdate: (update: RealtimeNoteUpdate) => void,
) {
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([{
    ...user,
    lastActiveAt: new Date().toISOString(),
  }]);
  const callbackRef = useRef(onRemoteUpdate);
  const supabaseChannel = useRef<RealtimeChannel | null>(null);
  const browserChannel = useRef<BroadcastChannel | null>(null);

  useEffect(() => { callbackRef.current = onRemoteUpdate; }, [onRemoteUpdate]);

  useEffect(() => {
    if (!noteId) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const channel = supabase.channel(`note:${noteId}`, { config: { presence: { key: user.id } } });
      supabaseChannel.current = channel;
      channel
        .on("broadcast", { event: "note:update" }, ({ payload }) => {
          const update = payload as RealtimeNoteUpdate;
          if (update.updatedBy.id !== user.id) callbackRef.current(update);
        })
        .on("presence", { event: "sync" }, () => {
          const editors = Object.values(channel.presenceState()).flat().map((presence) => presence as unknown as ActiveEditor);
          setActiveEditors(editors);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") await channel.track({ ...user, lastActiveAt: new Date().toISOString() });
        });
      return () => { void supabase.removeChannel(channel); supabaseChannel.current = null; };
    }

    const channel = new BroadcastChannel(`nexa-note:${noteId}`);
    browserChannel.current = channel;
    channel.onmessage = (event: MessageEvent<RealtimeNoteUpdate>) => {
      if (event.data.updatedBy.id !== user.id) callbackRef.current(event.data);
    };
    return () => { channel.close(); browserChannel.current = null; };
  }, [noteId, user]);

  const publish = useCallback((update: RealtimeNoteUpdate) => {
    browserChannel.current?.postMessage(update);
    void supabaseChannel.current?.send({ type: "broadcast", event: "note:update", payload: update });
  }, []);

  return { activeEditors, publish };
}
