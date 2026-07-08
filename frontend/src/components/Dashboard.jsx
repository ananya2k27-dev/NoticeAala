import React, { useEffect, useState } from "react";
import { fetchReminders, updateReminder, deleteReminder } from "../api/api";
import ReminderCard from "./ReminderCard";

export default function Dashboard({ phone, onLogout }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchReminders(phone);
      setReminders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [phone]);

  const handleToggleDone = async (reminder) => {
    const newStatus = reminder.status === "done" ? "pending" : "done";
    await updateReminder(reminder._id, { status: newStatus });
    load();
  };

  const handleDelete = async (reminder) => {
    await deleteReminder(reminder._id);
    load();
  };

  const filtered =
    filter === "all" ? reminders : reminders.filter((r) => r.category === filter);

  const categories = ["all", "exam", "fee", "placement", "event", "other"];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Your Reminders</h2>
        <button onClick={onLogout} style={{ fontSize: 13, cursor: "pointer" }}>
          Switch number
        </button>
      </div>
      <p style={{ color: "#6b7280", fontSize: 14 }}>{phone}</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: filter === c ? "#111827" : "#f9fafb",
              color: filter === c ? "#fff" : "#111827",
              cursor: "pointer",
              fontSize: 13,
              textTransform: "capitalize",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <p>Loading...</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: "#6b7280" }}>
          No reminders yet. Forward a notice photo or PDF to the WhatsApp bot to get started.
        </p>
      )}

      {filtered.map((r) => (
        <ReminderCard
          key={r._id}
          reminder={r}
          onToggleDone={handleToggleDone}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
