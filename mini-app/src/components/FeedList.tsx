// src/components/FeedList.tsx
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import type { FeedEntry } from "../api/types";

const ACTION_LABEL: Record<string, string> = {
  feed: "покормил(а)", play: "поиграл(а)", pet: "погладил(а)",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "только что";
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} д назад`;
}

export function FeedList() {
  const { feed, fetchFeed, pet } = usePetStore();

  useEffect(() => { if (pet) fetchFeed(); }, [pet?.id]);

  if (!feed.length) return (
    <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, marginTop: 8 }}>
      Пока никто ничего не делал...
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <AnimatePresence>
        {feed.slice(0, 10).map((e: FeedEntry, i: number) => (
          <motion.div
            key={`${e.performed_at}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: "10px 14px", borderRadius: 14,
              background: "#f8f8f8", fontSize: 13, color: "#666",
            }}
          >
            <span style={{ fontWeight: 600, color: "#444" }}>
              Пользователь {e.user_id}
            </span>{" "}
            {ACTION_LABEL[e.action]} питомца
            <span style={{ float: "right", color: "#bbb" }}>
              {timeAgo(e.performed_at)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}