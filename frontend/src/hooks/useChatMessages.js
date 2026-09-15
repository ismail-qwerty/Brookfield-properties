import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

const POLL_MS = 2000;

// Messages for one conversation, kept live by polling.
// - After the first load, each poll asks only for messages newer than the last
//   one seen, so an idle thread costs an almost-empty response.
// - Polls are chained (the next starts after the previous finishes), so slow
//   responses never pile up, and polling pauses while the tab is hidden.
// - send() shows the message immediately and swaps in the saved copy when the
//   server confirms, instead of waiting on a second round trip to refetch.
export default function useChatMessages(conversationId, { userId, markRead = false } = {}) {
  // Keyed by conversation so switching threads never shows the previous one's
  // messages, without having to reset state inside an effect.
  const [thread, setThread] = useState({ id: null, messages: [], loaded: false });
  const latestRef = useRef(null);

  const appendTo = (id, incoming) =>
    setThread((prev) => {
      const base = prev.id === id ? prev : { id, messages: [], loaded: false };
      const known = new Set(base.messages.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      if (!fresh.length && base.loaded && base === prev) return prev;
      return { id, messages: fresh.length ? [...base.messages, ...fresh] : base.messages, loaded: true };
    });

  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    let timer;
    let first = true;
    let inFlight = false;
    latestRef.current = null;

    const poll = async () => {
      if (inFlight) return;
      clearTimeout(timer);
      if (first || !document.hidden) {
        inFlight = true;
        try {
          const after = latestRef.current;
          const { data } = await api.get(`/chat/conversations/${conversationId}/messages`, {
            params: after ? { after } : undefined,
          });
          if (cancelled) return;
          const incoming = data.data || [];
          // Only server rows move the cursor: advancing it past a message we
          // just sent could skip a reply that was saved a moment earlier.
          if (incoming.length) latestRef.current = incoming[incoming.length - 1].created_at;
          appendTo(conversationId, incoming);
          if (markRead && incoming.some((m) => m.sender_id !== userId)) {
            api.put(`/chat/conversations/${conversationId}/read`).catch(() => {});
          }
        } catch {
          if (!cancelled) appendTo(conversationId, []);
        } finally {
          inFlight = false;
        }
        first = false;
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    };

    // Coming back to the tab catches up at once rather than on the next tick.
    const onVisible = () => {
      if (!document.hidden) poll();
    };

    poll();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [conversationId, userId, markRead]);

  const send = useCallback(
    async ({ text = '', imageUrl = null }) => {
      if (!conversationId) return;
      const body = text.trim() || (imageUrl ? 'Sent an image' : '');
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic = {
        id: tempId,
        sender_id: userId,
        message: body,
        message_type: imageUrl ? 'image' : 'text',
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        pending: true,
      };

      setThread((prev) =>
        prev.id === conversationId ? { ...prev, messages: [...prev.messages, optimistic] } : prev
      );

      try {
        const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, {
          message: body,
          image_url: imageUrl,
        });
        const saved = data.data;
        setThread((prev) => {
          if (prev.id !== conversationId) return prev;
          // A poll may have delivered the saved copy before this response did.
          const alreadyThere = prev.messages.some((m) => m.id === saved.id);
          return {
            ...prev,
            messages: alreadyThere
              ? prev.messages.filter((m) => m.id !== tempId)
              : prev.messages.map((m) => (m.id === tempId ? saved : m)),
          };
        });
      } catch (error) {
        setThread((prev) =>
          prev.id === conversationId ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) } : prev
        );
        throw error;
      }
    },
    [conversationId, userId]
  );

  const current = thread.id === conversationId ? thread : { messages: [], loaded: false };
  return { messages: current.messages, loaded: current.loaded, send };
}
