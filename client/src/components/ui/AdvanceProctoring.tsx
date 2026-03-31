import React, { useRef, useState, useEffect } from "react";
 
interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraReady: boolean;
  isFaceDetected: boolean;
  statusText?: string;
  violationCount: number;
  autoSubmitAt?: number;
}
 
const VIOLATION_LIMIT_WARN = 3;
 
export default function AdvancedProctoring({
  videoRef,
  isCameraReady,
  isFaceDetected,
  statusText,
  violationCount,
  autoSubmitAt = 7,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
 
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [flash, setFlash] = useState(false);
 
  // Flash red border on new violation
  useEffect(() => {
    if (violationCount === 0) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 800);
    return () => clearTimeout(t);
  }, [violationCount]);
 
  const onMouseDown = (e: React.MouseEvent) => {
    // Don't drag when clicking buttons
    if ((e.target as HTMLElement).closest("button")) return;
    if (!divRef.current) return;
    setDragging(true);
    const rect = divRef.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  };
 
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      setPosition({
        x: Math.max(0, e.clientX - offset.current.x),
        y: Math.max(0, e.clientY - offset.current.y),
      });
    };
    const onMouseUp = () => setDragging(false);
 
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);
 
  const statusColor =
    !isCameraReady
      ? "#6b7280"
      : isFaceDetected
      ? "#22c55e"
      : violationCount >= VIOLATION_LIMIT_WARN
      ? "#ef4444"
      : "#f59e0b"; // Warning color if camera ready but face not detected
 
  const progressPercent = Math.min((violationCount / autoSubmitAt) * 100, 100);
  const progressColor =
    violationCount >= autoSubmitAt - 2
      ? "#ef4444"
      : violationCount >= VIOLATION_LIMIT_WARN
      ? "#f59e0b"
      : "#22c55e";
 
  return (
    <div
      ref={divRef}
      onMouseDown={onMouseDown}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 9999,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        width: minimized ? "48px" : "192px",
        transition: "width 0.25s ease, box-shadow 0.2s ease",
      }}
    >
      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: flash
            ? "2px solid #ef4444"
            : "1.5px solid rgba(255,255,255,0.15)",
          background: "#0f0f0f",
          boxShadow: flash
            ? "0 0 0 4px rgba(239,68,68,0.25)"
            : "0 8px 32px rgba(0,0,0,0.5)",
          transition: "border 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: minimized ? "6px" : "6px 8px",
            background: "rgba(255,255,255,0.05)",
            borderBottom: minimized ? "none" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Status dot + label */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: statusColor,
                flexShrink: 0,
                boxShadow: isCameraReady ? `0 0 6px ${statusColor}` : "none",
                animation: isCameraReady ? "ap-pulse 1.8s ease infinite" : "none",
              }}
            />
            {!minimized && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.6)",
                  textTransform: "uppercase",
                }}
              >
                {statusText || (isCameraReady 
                  ? (isFaceDetected ? "Monitoring" : "Searching...") 
                  : "Starting...")}
              </span>
            )}
          </div>
 
          {/* Violation badge + minimize toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {violationCount > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  background: violationCount >= VIOLATION_LIMIT_WARN ? "#ef4444" : "#f59e0b",
                  color: "#fff",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  minWidth: "16px",
                  textAlign: "center",
                  animation: flash ? "ap-shake 0.3s ease" : "none",
                }}
              >
                {violationCount}
              </span>
            )}
            <button
              onClick={() => setMinimized((v) => !v)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                color: "rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                lineHeight: 1,
              }}
              title={minimized ? "Expand" : "Minimize"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                {minimized ? (
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
 
        {/* Camera and Footer — only show content when not minimized, BUT always keep video in DOM to maintain ref */}
        <div 
          style={{ 
            display: minimized ? "none" : "block",
            position: "relative" 
          }}
        >
          <div style={{ position: "relative", background: "#000", aspectRatio: "4/3" }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: "scaleX(-1)", 
              }}
            />
            
            {/* ... rest of existing overlays: not-ready, corners, flash ... */}
            {!isCameraReady && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.85)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "ap-spin 0.8s linear infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "9px",
                      color: "rgba(255,255,255,0.5)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                    }}
                  >
                    Camera init
                  </span>
                </div>
              )}
              {isCameraReady && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ position: "absolute", top: 6, left: 6, width: 14, height: 14, borderTop: "1.5px solid rgba(34,197,94,0.7)", borderLeft: "1.5px solid rgba(34,197,94,0.7)" }} />
                  <div style={{ position: "absolute", top: 6, right: 6, width: 14, height: 14, borderTop: "1.5px solid rgba(34,197,94,0.7)", borderRight: "1.5px solid rgba(34,197,94,0.7)" }} />
                  <div style={{ position: "absolute", bottom: 6, left: 6, width: 14, height: 14, borderBottom: "1.5px solid rgba(34,197,94,0.7)", borderLeft: "1.5px solid rgba(34,197,94,0.7)" }} />
                  <div style={{ position: "absolute", bottom: 6, right: 6, width: 14, height: 14, borderBottom: "1.5px solid rgba(34,197,94,0.7)", borderRight: "1.5px solid rgba(34,197,94,0.7)" }} />
                </div>
              )}
              {flash && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(239,68,68,0.25)",
                    pointerEvents: "none",
                    animation: "ap-flash 0.4s ease",
                  }}
                />
              )}
          </div>
          
          {/* Footer ... */}
          <div style={{ padding: "6px 8px", background: "rgba(0,0,0,0.6)" }}>
              <div style={{ height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden", marginBottom: "5px" }}>
                <div style={{ height: "100%", width: `${progressPercent}%`, background: progressColor, borderRadius: "2px", transition: "width 0.4s ease, background 0.3s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Violations</span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: violationCount >= autoSubmitAt - 2 ? "#ef4444" : "rgba(255,255,255,0.35)" }}>{violationCount}/{autoSubmitAt}</span>
              </div>
          </div>
        </div>

        {/* When minimized, keep video in DOM but hide container */}
        <div style={{ display: minimized ? "block" : "none", height: 0, overflow: "hidden" }}>
           {/* video stays in the first block above, we don't need a second one here. 
               The block above is display:none when minimized, which is enough to hide it. */}
        </div>
      </div>
 
      {/* Keyframe styles */}
      <style>{`
        @keyframes ap-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ap-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ap-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ap-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
 
