"use client";

import { useState, useRef } from "react";
import { Camera, Upload, RotateCcw } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const API_BASE = "http://127.0.0.1:8000";

export default function VisionPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const fileInputRef = useRef(null);

  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setAnalysisResult("");
    }
  };

  const analyzeImage = async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setAnalysisResult("");

    const formData = new FormData();
    // backend expects field name "file"
    formData.append("file", imageFile);
    formData.append("prompt", "Que voyez-vous sur cette image médicale ? Donnez une analyse détaillée.");

    try {
      const res = await fetch(`${API_BASE}/api/vision`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      setAnalysisResult(data.analysis);
    } catch {
      setAnalysisResult("Erreur lors de l'analyse. Assurez-vous que le backend est démarré sur le port 8000.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setSelectedImage(null);
    setImageFile(null);
    setAnalysisResult("");
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
            <Camera size={16} color="white" />
          </div>
          <h1>Analyse d&apos;Image Médicale</h1>
          {selectedImage && (
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
            Sélectionnez une image médicale (radiographie, blessure, résultat d'analyse…) pour que
            Dr. Hemo vous donne une description et son analyse.
          </p>

          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImagePick}
          />

          {/* Drop zone / preview */}
          {selectedImage ? (
            <div style={{ position: "relative" }}>
              <img src={selectedImage} alt="Aperçu" className="preview-img" />
              {isProcessing && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  <div className="spinner spinner-accent" style={{ width: 40, height: 40, borderWidth: 3 }} />
                  <span style={{ color: "white", fontWeight: 600 }}>Analyse en cours...</span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="drop-zone"
              onClick={() => fileInputRef.current.click()}
            >
              <Camera size={48} className="dz-icon" style={{ color: "var(--text-muted)" }} />
              <div className="dz-title">Cliquez pour sélectionner une image</div>
              <div className="dz-subtitle">PNG, JPG, WEBP — Radios, photos de blessures…</div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="action-btn"
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                flex: 1,
              }}
              onClick={() => fileInputRef.current.click()}
            >
              <Camera size={18} color="var(--accent)" />
              Choisir une image
            </button>

            <button
              className="action-btn primary"
              style={{ flex: 2 }}
              onClick={analyzeImage}
              disabled={!selectedImage || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="spinner" /> Analyse en cours...
                </>
              ) : (
                <>
                  <Upload size={18} /> Analyser avec Dr. Hemo
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {analysisResult && (
            <div className="result-card">
              <div className="result-header">
                <span>🩸</span>
                <span>Analyse de Dr. Hemo</span>
              </div>
              <p>{analysisResult}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
