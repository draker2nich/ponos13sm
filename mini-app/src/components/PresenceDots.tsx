import type { Owner } from "../api";

const today = () => new Date().toISOString().slice(0, 10);

/** The product's signature: one dot per owner, filled once they've looked after the pet today (UTC, like the streak) */
export function PresenceDots({ owners }: { owners: Owner[] }) {
  const slots = owners.length > 1 ? owners : [...owners, null];
  return (
    <span className="presence" aria-label="Кто заходил сегодня">
      {slots.map((o, i) => (
        <span
          key={o?.user_id ?? `empty-${i}`}
          className={`presence__dot${o?.last_active_at?.startsWith(today()) ? " presence__dot--on" : ""}${o ? "" : " presence__dot--empty"}`}
        />
      ))}
    </span>
  );
}
