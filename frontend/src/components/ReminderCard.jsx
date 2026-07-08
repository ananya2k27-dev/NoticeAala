import React from "react";

const categoryColors = {
  exam: "#ef4444",
  fee: "#f59e0b",
  placement: "#3b82f6",
  event: "#10b981",
  other: "#6b7280",
};

export default function ReminderCard({ reminder, onToggleDone, onDelete }) {
  const color = categoryColors[reminder.category] || categoryColors.other;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderLeft: `5px solid ${color}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        opacity: reminder.status === "done" ? 0.5 : 1,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>{reminder.title}</h3>
          <span style={{ fontSize: 12, color, textTransform: "uppercase", fontWeight: 600 }}>
            {reminder.category}
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{reminder.urgency} urgency</span>
      </div>

      {reminder.eventDate && (
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          📅 {new Date(reminder.eventDate).toDateString()} {reminder.eventTime}
        </p>
      )}
      {reminder.actionRequired && (
        <p style={{ margin: "4px 0 0", fontSize: 14 }}>✅ {reminder.actionRequired}</p>
      )}
      {reminder.summary && (
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#4b5563" }}>{reminder.summary}</p>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => onToggleDone(reminder)} style={btnStyle}>
          {reminder.status === "done" ? "Mark pending" : "Mark done"}
        </button>
        <button onClick={() => onDelete(reminder)} style={{ ...btnStyle, color: "#ef4444" }}>
          Delete
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  fontSize: 13,
  padding: "6px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "#f9fafb",
  cursor: "pointer",
};
