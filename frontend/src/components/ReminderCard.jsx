import React from "react";

const CATEGORY_STYLE = {
  exam: { color: "var(--cat-exam)", soft: "var(--cat-exam-soft)", emoji: "📝" },
  fee: { color: "var(--cat-fee)", soft: "var(--cat-fee-soft)", emoji: "💰" },
  placement: { color: "var(--cat-placement)", soft: "var(--cat-placement-soft)", emoji: "💼" },
  event: { color: "var(--cat-event)", soft: "var(--cat-event-soft)", emoji: "🎉" },
  other: { color: "var(--cat-other)", soft: "var(--cat-other-soft)", emoji: "📌" },
};

export default function ReminderCard({ reminder, onToggleDone, onDelete }) {
  const style = CATEGORY_STYLE[reminder.category] || CATEGORY_STYLE.other;
  const isDone = reminder.status === "done";

  return (
    <div
      className={`card-surface reminder-card ${isDone ? "done" : ""}`}
      style={{ "--cat-color": style.color }}
    >
      <div className="reminder-top">
        <div>
          <h3 className={`reminder-title ${isDone ? "done" : ""}`}>{reminder.title}</h3>
          <span
            className="badge"
            style={{ background: style.soft, color: style.color, marginTop: 6 }}
          >
            {style.emoji} {reminder.category}
          </span>
          {reminder.section && (
            <span className="badge" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)", marginLeft: 6, marginTop: 6 }}>
              {reminder.section}
            </span>
          )}
        </div>
        <span className={`urgency-badge ${reminder.urgency === "high" ? "high" : ""}`}>
          {reminder.urgency} urgency
        </span>
      </div>

      {reminder.eventDate && (
        <p className="reminder-meta">
          📅 {new Date(reminder.eventDate).toDateString()} {reminder.eventTime}
        </p>
      )}
      {reminder.actionRequired && <p className="reminder-meta">✅ {reminder.actionRequired}</p>}
      {reminder.summary && <p className="reminder-summary">{reminder.summary}</p>}

      <div className="reminder-actions">
        <button className="icon-btn" onClick={() => onToggleDone(reminder)}>
          {isDone ? "Mark pending" : "Mark done"}
        </button>
        <button className="icon-btn danger" onClick={() => onDelete(reminder)}>
          Delete
        </button>
      </div>
    </div>
  );
}