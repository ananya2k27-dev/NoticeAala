import React, { useState } from "react";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [phone, setPhone] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState(null);

  if (submittedPhone) {
    return <Dashboard phone={submittedPhone} onLogout={() => setSubmittedPhone(null)} />;
  }

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "80px auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 22 }}>Campus Circular Agent</h1>
      <p style={{ color: "#6b7280", fontSize: 14 }}>
        Enter the phone number you used on WhatsApp to see your reminders.
      </p>
      <input
        type="tel"
        placeholder="+91XXXXXXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{
          width: "100%",
          padding: 10,
          marginTop: 16,
          borderRadius: 6,
          border: "1px solid #e5e7eb",
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />
      <button
        onClick={() => phone && setSubmittedPhone(phone)}
        style={{
          marginTop: 12,
          width: "100%",
          padding: 10,
          borderRadius: 6,
          border: "none",
          background: "#111827",
          color: "#fff",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        View reminders
      </button>
    </div>
  );
}
