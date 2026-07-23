import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [role, setRole] = useState("student"); // "student" | "admin"
  const [phone, setPhone] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState(null);
  const [adminToken, setAdminToken] = useState("");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  const showLoggedInView = role === "student" ? !!submittedPhone : adminLoggedIn;

  if (showLoggedInView) {
    return (
      <div className="app-shell">
        <TopBar
          role={role}
          onSwitchRole={(r) => {
            setRole(r);
            setSubmittedPhone(null);
            setAdminLoggedIn(false);
          }}
        />
        <div className="page-container">
          {role === "student" ? (
            <Dashboard phone={submittedPhone} onLogout={() => setSubmittedPhone(null)} />
          ) : (
            <AdminPanel adminToken={adminToken} onLogout={() => setAdminLoggedIn(false)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar role={role} onSwitchRole={setRole} />
      <div className="page-container">
        <div className="card-surface login-card">
          <div style={{ fontSize: 30 }}>{role === "student" ? "🔔" : "🧑‍🏫"}</div>
          <h1>{role === "student" ? "View your reminders" : "Send a notice"}</h1>
          <p>
            {role === "student"
              ? "Enter the phone number you used on WhatsApp to see your reminders."
              : "Enter the admin access code shared with your faculty account to broadcast notices to a section."}
          </p>

          {role === "student" ? (
            <>
              <input
                className="text-input"
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && phone && setSubmittedPhone(phone)}
              />
              <button
                className="btn-primary"
                onClick={() => phone && setSubmittedPhone(phone)}
                disabled={!phone}
              >
                View reminders
              </button>
            </>
          ) : (
            <>
              <input
                className="text-input"
                type="password"
                placeholder="Admin access code"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adminToken && setAdminLoggedIn(true)}
              />
              <button
                className="btn-primary"
                onClick={() => adminToken && setAdminLoggedIn(true)}
                disabled={!adminToken}
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TopBar({ role, onSwitchRole }) {
  return (
    <div className="app-topbar">
      <div className="brand">
        <div className="brand-badge">🔔</div>
        Campus Circular Agent
      </div>
      <div className="pill-toggle">
        <button className={role === "student" ? "active" : ""} onClick={() => onSwitchRole("student")}>
          Student
        </button>
        <button className={role === "admin" ? "active" : ""} onClick={() => onSwitchRole("admin")}>
          Teacher / Admin
        </button>
      </div>
    </div>
  );
}
