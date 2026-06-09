// src/components/BarcodeScanner.jsx
import { useEffect, useRef, useState } from "react";

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const instanceRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopped = false;

    async function startScanner() {
      try {
        // Dynamically import so it doesn't bloat initial bundle
        const { Html5Qrcode } = await import("html5-qrcode");

        if (stopped) return;

        const scanner = new Html5Qrcode("qr-reader");
        instanceRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" }, // rear camera
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            // Success — stop scanner and return barcode
            scanner.stop().catch(() => {});
            onDetected(decodedText);
          },
          () => {} // scan failures are normal, suppress them
        );

        setLoading(false);
      } catch (err) {
        setError(
          err?.message?.includes("permission")
            ? "Camera access denied. Please allow camera access in Safari Settings."
            : "Could not start camera. Try again or enter barcode manually."
        );
        setLoading(false);
      }
    }

    startScanner();

    return () => {
      stopped = true;
      instanceRef.current?.stop().catch(() => {});
    };
  }, [onDetected]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", color: "#c8a96e", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "4px" }}>
              Barcode Scanner
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#f5f5f0" }}>
              Point at a barcode
            </div>
          </div>
          <button onClick={onClose} style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "#2c2c2e", border: "none", color: "#f5f5f0",
            fontSize: "18px", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {error ? (
          <div style={{
            background: "#ff3b3020", border: "1px solid #ff3b3060",
            borderRadius: "16px", padding: "24px", textAlign: "center",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📷</div>
            <div style={{ color: "#ff3b30", fontSize: "14px", lineHeight: 1.5 }}>{error}</div>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {loading && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 10,
                background: "#1c1c1e", borderRadius: "16px",
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: "200px",
              }}>
                <div style={{ color: "#8e8e93", fontSize: "14px" }}>Starting camera…</div>
              </div>
            )}
            <div
              id="qr-reader"
              ref={scannerRef}
              style={{
                width: "100%",
                borderRadius: "16px",
                overflow: "hidden",
                border: "2px solid #c8a96e40",
              }}
            />
          </div>
        )}

        <div style={{ marginTop: "16px", textAlign: "center", color: "#6e6e73", fontSize: "13px" }}>
          Supports UPC-A, UPC-E, EAN-13, and QR codes
        </div>
      </div>
    </div>
  );
}
