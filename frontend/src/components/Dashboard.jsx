import React, { useEffect, useState } from "react";
import { fetchReminders, updateReminder, deleteReminder } from "../api/api";
import ReminderCard from "./ReminderCard";

const CATEGORIES = ["all", "exam", "fee", "placement", "event", "other"];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const handleToggleDone = async (reminder) => {
    const newStatus = reminder.status === "done" ? "pending" : "done";
    setReminders((prev) =>
      prev.map((r) => (r._id === reminder._id ? { ...r, status: newStatus } : r))
    );
    await updateReminder(reminder._id, { status: newStatus });
  };

  const handleDelete = async (reminder) => {
    setReminders((prev) => prev.filter((r) => r._id !== reminder._id));
    await deleteReminder(reminder._id);
  };

  const filtered =
    filter === "all" ? reminders : reminders.filter((r) => r.category === filter);

  const pendingCount = reminders.filter((r) => r.status !== "done").length;
  const now = new Date();
  const dueSoonCount = reminders.filter(
    (r) =>
      r.status !== "done" &&
      r.eventDate &&
      new Date(r.eventDate) - now <= 48 * 60 * 60 * 1000 &&
      new Date(r.eventDate) - now >= 0
  ).length;
  const doneCount = reminders.filter((r) => r.status === "done").length;

  return (
    <div>
      <div className="dash-header">
        <div>
          <h2>Your Reminders</h2>
          <div className="subtext">{phone}</div>
        </div>
        <button className="btn-secondary" onClick={onLogout}>
          Switch number
        </button>
      </div>

      {!loading && reminders.length > 0 && (
        <div className="stat-row">
          <div className="card-surface stat-card">
            <div className="stat-num">{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="card-surface stat-card">
            <div className="stat-num" style={{ color: dueSoonCount > 0 ? "var(--danger)" : undefined }}>
              {dueSoonCount}
            </div>
            <div className="stat-label">Due in 48h</div>
          </div>
          <div className="card-surface stat-card">
            <div className="stat-num">{doneCount}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      )}

      <div className="chip-row">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`chip ${filter === c ? "active" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card-surface empty-state">
          <div className="empty-emoji">📭</div>
          {reminders.length === 0 ? (
            <>
              No reminders yet.
              <br />
              Forward a notice photo or PDF to the WhatsApp bot to get started.
            </>
          ) : (
            <>No reminders in this category.</>
          )}
        </div>
      )}

      {!loading &&
        filtered.map((r) => (
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
