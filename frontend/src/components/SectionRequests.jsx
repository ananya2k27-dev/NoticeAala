import React, { useEffect, useState } from "react";
import { fetchPendingRequests, approveRequest, denyRequest } from "../api/api";

export default function SectionRequests({ adminToken }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState(null); // request id currently being approved/denied

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingRequests(adminToken);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecision = async (id, decision) => {
    setActingOn(id);
    try {
      if (decision === "approve") await approveRequest(id, adminToken);
      else await denyRequest(id, adminToken);
      // Vanish immediately from the dashboard once resolved.
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setActingOn(null);
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 56 }} />;

  if (requests.length === 0) {
    return (
      <div className="card-surface empty-state" style={{ padding: 28 }}>
        <div className="empty-emoji">✅</div>
        No pending section-switch requests.
      </div>
    );
  }

  return (
    <div>
      {requests.map((r) => (
        <div key={r._id} className="card-surface request-row">
          <div>
            <div className="request-phone">{r.phoneNumber.replace("whatsapp:", "")}</div>
            <div className="request-move">
              <span className="badge" style={{ background: "var(--cat-other-soft)", color: "var(--cat-other)" }}>
                {r.currentSection || "no section"}
              </span>
              <span style={{ margin: "0 6px", color: "var(--text-faint)" }}>→</span>
              <span className="badge" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)" }}>
                {r.requestedSection}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="icon-btn"
              style={{ borderColor: "var(--success)", color: "var(--success)" }}
              disabled={actingOn === r._id}
              onClick={() => handleDecision(r._id, "approve")}
            >
              Approve
            </button>
            <button
              className="icon-btn danger"
              disabled={actingOn === r._id}
              onClick={() => handleDecision(r._id, "deny")}
            >
              Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
