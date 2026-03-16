"use client";

import { useState, useRef } from "react";
import { FileText, Upload, RotateCcw } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const API_BASE = "http://127.0.0.1:8000";

export default function FilesPage() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryResult, setSummaryResult] = useState("");
  const fileInputRef = useRef(null);

  const handleFilePick = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSummaryResult("");
    }
  };

  const analyzeFile = async () => {
    if (!file) return;
    setIsProcessing(true);
    setSummaryResult("");

    const formData = new FormData();
    // Backend uses /api/analyze-file with field "file"
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/analyze-file`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      // Backend returns { summary, filename }
      setSummaryResult(data.summary);
    } catch {
      setSummaryResult("Erreur lors de l'analyse du document. Assurez-vous que le backend est démarré sur le port 8000.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setSummaryResult("");
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content" style={{ overflowY: "auto" }}>
        <div className="page-header">
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #10a37f, #0a7c61)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileText size={16} color="white" />
          </div>
          <h1>Résumé de Document Médical</h1>
          {file && (
            <button
              onClick={reset}
              style={{
                marginLeft: "auto",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "var(--input-bg)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={12} /> Réinitialiser
            </button>
          )}
        </div>

        <div className="tool-page">
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Téléchargez vos résultats d&apos;analyse médicale, ordonnances ou comptes-rendus (PDF ou image).
            Dr. Hemo vous fournira un résumé clair et des explications adaptées.
          </p>

          {/* Hidden input */}
          <input
            type="file"
            accept=".pdf,image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFilePick}
          />

          {/* Drop zone */}
          <div
            className={`drop-zone ${file ? "has-file" : ""}`}
            onClick={() => fileInputRef.current.click()}
          >
            <FileText
              size={48}
              className="dz-icon"
              style={{ color: file ? "var(--accent)" : "var(--text-muted)" }}
            />
            {file ? (
              <>
                <div className="dz-title">{file.name}</div>
                <div className="dz-subtitle">{formatSize(file.size)} · Cliquez pour changer</div>
              </>
            ) : (
              <>
                <div className="dz-title">Cliquez pour choisir un document</div>
                <div className="dz-subtitle">PDF, PNG, JPG — Résultats d&apos;analyses, ordonnances…</div>
              </>
            )}
          </div>

          {/* Analyze button */}
          <button
            className="action-btn primary"
            onClick={analyzeFile}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="spinner" /> Analyse en cours...
              </>
            ) : (
              <>
                <Upload size={18} /> Générer un résumé avec Dr. Hemo
              </>
            )}
          </button>

          {/* Result */}
          {summaryResult && (
            <div className="result-card">
              <div className="result-header">
                <span>🩸</span>
                <span>Résumé de Dr. Hemo</span>
              </div>
              <p>{summaryResult}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
