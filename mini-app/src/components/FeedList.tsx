// mini-app/src/components/FeedList.tsx  (не используется в новом HomePage, оставлен для расширения)
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import type { FeedEntry } from "../api/types";

const ACTION_LABEL: Record<string, string> = {
  feed: "покормил(а)",
  play: "поиграл(а)",
  pet:  "погладил(а)",
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
  const fetchedForPetId = useRef<number | null>(null);

  useEffect(() => {
    if (pet && pet.id !== fetchedForPetId.current) {
      fetchedForPetId.current = pet.id;
      fetchFeed();
    }
  }, [pet?.id]);

  if (!feed.length) return (
    <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, margin: "8px 0" }}>
      Пока никто ничего не делал...
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <AnimatePresence>
        {feed.slice(0, 10).map((e: FeedEntry, i: number) => (
          <motion.div
            key={`${e.performed_at}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: "10px 14px", borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 12, color: "rgba(255,255,255,0.5)",
              display: "flex", justifyContent: "space-between",
            }}
          >
            <span>
              <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                {e.user_name ?? `Пользователь ${e.user_id}`}
              </span>{" "}
              {ACTION_LABEL[e.action] ?? e.action} питомца
            </span>
            <span style={{ color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap", marginLeft: 8 }}>
              {timeAgo(e.performed_at)}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}