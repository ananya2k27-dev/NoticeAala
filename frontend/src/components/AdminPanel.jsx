import React, { useEffect, useRef, useState } from "react";
import { fetchSections, sendBroadcast } from "../api/api";
import SectionRequests from "./SectionRequests";

const CATEGORIES = ["auto-detect", "exam", "fee", "placement", "event", "other"];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminPanel({ adminToken, onLogout }) {
  const [sections, setSections] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [category, setCategory] = useState("auto-detect");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { type: "success" | "error", message }
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSections()
      .then(setSections)
      .catch(() => setSections([]));
  }, []);

  const toggleSection = (s) => {
    setSelectedSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSend = async () => {
    if (!file || selectedSections.length === 0) return;
    setSending(true);
    setResult(null);
    try {
      const base64Data = await fileToBase64(file);
      const res = await sendBroadcast({
        adminToken,
        sections: selectedSections,
        base64Data,
        mimeType: file.type || "image/jpeg",
        categoryOverride: category === "auto-detect" ? undefined : category,
      });
      setResult({ type: "success", message: res.message });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setResult({
        type: "error",
        message: err?.response?.data?.message || "Something went wrong sending the notice.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="dash-header">
        <div>
          <h2>Teacher / Admin</h2>
          <div className="subtext">Send notices and resolve section-switch requests</div>
        </div>
        <button className="btn-secondary" onClick={onLogout}>
          Log out
        </button>
      </div>

      <h3 className="section-heading">Pending section requests</h3>
      <p className="form-hint" style={{ marginBottom: 10 }}>
        A student is only ever in one section. A request appears here when they ask to switch —
        approve or deny it, and it disappears from this list right away. You can also resolve these
        from WhatsApp by replying "approve &lt;phone&gt;" or "deny &lt;phone&gt;".
      </p>
      <SectionRequests adminToken={adminToken} />

      <h3 className="section-heading" style={{ marginTop: 28 }}>
        Send a notice
      </h3>
      <p className="form-hint" style={{ marginBottom: 10 }}>
        Only students in the section(s) you pick will receive it. The same targeting also works
        from WhatsApp — attach the notice with a caption like <code>to: CSE-DS-3</code>.
      </p>

      <div className="card-surface admin-form">
        <div className="form-row">
          <label>Target section(s)</label>
          {sections.length === 0 ? (
            <div className="form-hint">
              No sections found yet — students need to text "subscribe SECTION-NAME" on WhatsApp first.
            </div>
          ) : (
            <div className="section-tags">
              {sections.map((s) => (
                <button
                  key={s}
                  className={`section-tag ${selectedSections.includes(s) ? "selected" : ""}`}
                  onClick={() => toggleSection(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-row">
          <label>Category</label>
          <select
            className="text-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "auto-detect" ? "Auto-detect from the notice" : c}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Notice file (image or PDF)</label>
          <div
            className="file-drop"
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? `📎 ${file.name}` : "Click to choose a photo or PDF of the notice"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <button
          className="btn-primary"
          disabled={sending || !file || selectedSections.length === 0}
          onClick={handleSend}
        >
          {sending
            ? "Sending..."
            : `Send to ${selectedSections.length || 0} section(s)`}
        </button>

        {result && (
          <div className={`status-banner ${result.type}`}>{result.message}</div>
        )}
      </div>
    </div>
  );
}