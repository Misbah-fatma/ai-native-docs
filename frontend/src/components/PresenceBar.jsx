import { useEffect, useState } from "react";
import { api, initials } from "../api";

export default function PresenceBar({ documentId, user }) {
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function beat() {
      try {
        const data = await api(`/api/documents/${documentId}/presence`, { method: "POST" });
        if (!cancelled) {
          setViewers((data.viewers || []).filter((person) => person.id !== user.id));
        }
      } catch {
        if (!cancelled) setViewers([]);
      }
    }

    void beat();
    const timer = window.setInterval(() => void beat(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [documentId, user.id]);

  if (viewers.length === 0) {
    return <p className="text-xs text-ink-soft">Only you are here right now</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center -space-x-1.5">
        {viewers.slice(0, 4).map((person) => (
          <span
            key={person.id}
            title={`${person.name} is viewing`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-card bg-shared/15 text-[10px] font-medium text-shared"
          >
            {initials(person.name)}
          </span>
        ))}
      </div>
      <p className="text-xs text-ink-soft">
        {viewers.length === 1
          ? `${viewers[0].name} is viewing`
          : `${viewers.map((person) => person.name).join(", ")} are viewing`}
      </p>
    </div>
  );
}
