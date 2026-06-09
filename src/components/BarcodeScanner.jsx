// src/components/BarcodeScanner.jsx
// Uses native browser APIs directly — more reliable on iPhone Safari
import { useEffect, useRef, useState } from "react";

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectedRef = useRef(false);
  const [status, setStatus] = useState("loading"); // loading | scanning | found | error
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // Request camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true"); // critical for iOS
        await video.play();

        if (cancelled) return;
        setStatus("scanning");

        // Load barcode detector — use BarcodeDetector if available (Chrome),
        // otherwise fall back to html5-qrcode scanning on canvas frames
        if ("BarcodeDetector" in window) {
          const detector = new window.BarcodeDetector({
            formats: ["upc_a", "upc_e", "ean_13", "ean_8", "code_128", "code_39"],
          });
          scanWithDetector(detector, video, cancelled);
        } else {
          // Fallback: use ZXing via canvas snapshots
          scanWithZxing(video, cancelled);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || "";
        setErrorMsg(
          msg.includes("ermission")
            ? "Camera access denied.\n\nGo to Settings → Safari → Camera and set it to Allow, then reload the app."
            : "Could not access camera. Make sure you're using Safari and try again."
        );
        setStatus("error");
      }
    }

    async function scanWithDetector(detector, video, cancelled) {
      async function tick() {
        if (cancelled || detectedRef.current) return;
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            handleDetected(barcodes[0].rawValue);
            return;
          }
        } catch {}
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    async function scanWithZxing(video, cancelled) {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        function tick() {
          if (cancelled || detectedRef.current) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            try {
              const result = reader.decodeFromCanvas(canvas);
              if (result) {
                handleDetected(result.getText());
                return;
              }
            } catch {}
          }
          rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // If zxing also unavailable, show manual entry prompt
        setErrorMsg("Barcode scanning not supported in this browser. Please enter the item manually.");
        setStatus("error");
      }
    }

    function handleDetected(value) {
      if (detectedRef.current) return;
      detectedRef.current = true;
      stopStream();
      setStatus("found");
      setTimeout(() => { if (!cancelled) onDetected(value); }, 700);
    }

    function stopStream() {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onDetected]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      {/* Hidden canvas for fallback scanning */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", color: "#c8a96e", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "4px" }}>
              Barcode Scanner
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#f5f5f0" }}>
              {status === "found" ? "Got it!" : "Point at a barcode"}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: "38px", height: "38px", borderRadius: "50%",
            background: "#2c2c2e", border: "none", color: "#f5f5f0",
            fontSize: "18px", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div style={{ background: "#1c1c1e", borderRadius: "16px", height: "280px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "#8e8e93", fontSize: "14px" }}>Starting camera…</div>
          </div>
        )}

        {/* Video viewfinder */}
        <div style={{ display: status === "scanning" ? "block" : "none", position: "relative", borderRadius: "16px", overflow: "hidden", background: "#000" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", display: "block", borderRadius: "16px" }}
          />
          {/* Aim box overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "72%", height: "130px",
              border: "2px solid #c8a96e",
              borderRadius: "10px",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            }}>
              {/* Corner accents */}
              {[
                { top: -2, left: -2, borderTop: "3px solid #c8a96e", borderLeft: "3px solid #c8a96e" },
                { top: -2, right: -2, borderTop: "3px solid #c8a96e", borderRight: "3px solid #c8a96e" },
                { bottom: -2, left: -2, borderBottom: "3px solid #c8a96e", borderLeft: "3px solid #c8a96e" },
                { bottom: -2, right: -2, borderBottom: "3px solid #c8a96e", borderRight: "3px solid #c8a96e" },
              ].map((s, i) => (
                <div key={i} style={{ position: "absolute", width: "16px", height: "16px", borderRadius: "2px", ...s }} />
              ))}
            </div>
          </div>
        </div>

        {status === "scanning" && (
          <div style={{ marginTop: "12px", textAlign: "center", color: "#6e6e73", fontSize: "13px" }}>
            Line up the barcode inside the box
          </div>
        )}

        {/* Found */}
        {status === "found" && (
          <div style={{
            background: "#34c75915", border: "1px solid #34c75940",
            borderRadius: "16px", height: "200px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "12px",
          }}>
            <div style={{ fontSize: "48px" }}>✅</div>
            <div style={{ color: "#34c759", fontSize: "15px", fontWeight: 600 }}>Barcode scanned</div>
            <div style={{ color: "#6e6e73", fontSize: "13px" }}>Looking up product…</div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div style={{
            background: "#ff3b3015", border: "1px solid #ff3b3040",
            borderRadius: "16px", padding: "28px", textAlign: "center",
          }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📷</div>
            <div style={{ color: "#ff3b30", fontSize: "14px", lineHeight: 1.7, whiteSpace: "pre-line" }}>{errorMsg}</div>
            <button onClick={onClose} style={{
              marginTop: "20px", padding: "10px 24px", borderRadius: "10px",
              background: "#2c2c2e", border: "none", color: "#f5f5f0",
              fontSize: "14px", fontWeight: 600, cursor: "pointer",
            }}>Enter manually instead</button>
          </div>
        )}
      </div>
    </div>
  );
}
