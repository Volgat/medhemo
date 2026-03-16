"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const API_BASE = "http://127.0.0.1:8000";

export default function VoicePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setTranscript("");
      setAiResponse("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch {
      alert("Impossible d'accéder au microphone. Vérifiez les permissions du navigateur.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const processAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    try {
      const res = await fetch(`${API_BASE}/api/audio`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      setTranscript(data.transcription);
      setAiResponse(data.ai_response);
    } catch {
      setAiResponse("Erreur lors du traitement de l'audio. Vérifiez que le backend est démarré.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const statusText = isRecording
    ? "Je vous écoute..."
    : isProcessing
    ? "Analyse en cours..."
    : aiResponse
    ? "Réponse de Dr. Hemo"
    : "Appuyez sur le micro pour parler";

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
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
            <Mic size={16} color="white" />
          </div>
          <h1>Interaction Vocale</h1>
        </div>

        <div className="voice-page">
          {/* Avatar / Status */}
          <div className="voice-avatar-area">
            {/* Animated ring */}
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                background: isRecording
                  ? "rgba(239,68,68,0.08)"
                  : isProcessing
                  ? "rgba(16,163,127,0.08)"
                  : "rgba(16,163,127,0.05)",
                border: `3px solid ${isRecording ? "var(--danger)" : isProcessing ? "var(--accent)" : "var(--border)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                transition: "border-color 0.3s, background 0.3s",
                boxShadow: isRecording
                  ? "0 0 0 12px rgba(239,68,68,0.06), 0 0 0 24px rgba(239,68,68,0.03)"
                  : isProcessing
                  ? "0 0 0 12px rgba(16,163,127,0.06)"
                  : "none",
              }}
            >
              🩸
            </div>

            <h2
              className={`voice-status${isRecording ? " recording" : isProcessing ? " processing" : ""}`}
            >
              {statusText}
            </h2>

            {isRecording && (
              <div className="voice-timer">{formatTime(recordingTime)}</div>
            )}
          </div>

          {/* Result */}
          {!isRecording && !isProcessing && transcript && (
            <div className="voice-result" style={{ width: "100%", maxWidth: 640 }}>
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  Vous avez dit :
                </div>
                <p className="transcript">&ldquo;{transcript}&rdquo;</p>
              </div>
              {aiResponse && (
                <div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "var(--accent)",
                      marginBottom: "6px",
                    }}
                  >
                    Dr. Hemo répond :
                  </div>
                  <p className="ai-resp">{aiResponse}</p>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="voice-controls">
            {isRecording ? (
              <button className="mic-btn recording" onClick={stopRecording}>
                <Square size={28} fill="currentColor" />
              </button>
            ) : (
              <button
                className="mic-btn idle"
                onClick={startRecording}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="spinner" />
                ) : (
                  <Mic size={32} />
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
