// src/components/BarcodeScanner.jsx
import { useEffect, useRef, useState } from "react";

export default function BarcodeScanner({ onDetected, onClose }) {
  const instanceRef = useRef(null);
  const detectedRef = useRef(false);
  const [status, setStatus] = useState("loading"); // loading | scanning | found | error
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode("qr-reader-container");
        instanceRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 140 } },
          async (decodedText) => {
            // Guard against firing twice
            if (detectedRef.current) return;
            detectedRef.current = true;

            // Show "found" screen immediately — hides the library's white flash
            setStatus("found");

            // Stop the camera cleanly
            try { await scanner.stop(); } catch {}

            // Small delay so the found screen renders before we hand off
            setTimeout(() => {
              if (!cancelled) onDetected(decodedText);
            }, 600);
          },
          () => {} // ignore per-frame failures
        );

        if (!cancelled) setStatus("scanning");
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || "";
        setErrorMsg(
          msg.includes("permission") || msg.includes("Permission")
            ? "Camera access denied. Go to Settings → Safari → Camera and allow access."
            : "Could not start camera. Make sure you're using Safari on iPhone."
        );
        setStatus("error");
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      instanceRef.current?.stop().catch(() => {});
    };
  }, []); // eslint-disable-line

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0a0a0c",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", color: "#c8a96e", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "4px" }}>
              Barcode Scanner
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#f5f5f0" }}>
              {status === "found" ? "Got it!" : "Point at a barcode"}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "#2c2c2e", border: "none", color: "#f5f5f0",
            fontSize: "18px", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div style={{ background: "#1c1c1e", borderRadius: "16px", minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "#8e8e93", fontSize: "14px" }}>Starting camera…</div>
          </div>
        )}

        {/* Camera view — keep mounted while scanning so stop() works cleanly */}
        <div style={{ display: status === "scanning" ? "block" : "none" }}>
          <div id="qr-reader-container" style={{ width: "100%", borderRadius: "16px", overflow: "hidden", border: "2px solid #c8a96e40", background: "#1c1c1e" }} />
          <div style={{ marginTop: "14px", textAlign: "center", color: "#6e6e73", fontSize: "13px" }}>
            Supports UPC-A, UPC-E, EAN-13
          </div>
        </div>

        {/* Found state — shown immediately on detect, hides white flash */}
        {status === "found" && (
          <div style={{
            background: "#34c75915", border: "1px solid #34c75940",
            borderRadius: "16px", minHeight: "220px",
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
            <div style={{ color: "#ff3b30", fontSize: "14px", lineHeight: 1.6 }}>{errorMsg}</div>
            <button onClick={onClose} style={{
              marginTop: "20px", padding: "10px 20px", borderRadius: "10px",
              background: "#2c2c2e", border: "none", color: "#f5f5f0",
              fontSize: "14px", fontWeight: 600, cursor: "pointer",
            }}>Enter manually instead</button>
          </div>
        )}

      </div>
    </div>
  );
}
