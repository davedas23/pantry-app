// src/components/BarcodeScanner.jsx
import { useEffect, useRef, useState } from "react";

function loadZxing() {
  return new Promise((resolve, reject) => {
    if (window.ZXing) { resolve(window.ZXing); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js";
    script.onload = () => resolve(window.ZXing);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const detectedRef = useRef(false);
  const [status, setStatus] = useState("loading"); // loading | scanning | manual | found
  const [manualBarcode, setManualBarcode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const ZXing = await loadZxing();
        if (cancelled) return;
        const codeReader = new ZXing.BrowserMultiFormatReader();
        readerRef.current = codeReader;
        const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();
        if (cancelled) return;
        const rear = devices.find(d =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        ) || devices[devices.length - 1] || devices[0];
        if (!rear) throw new Error("No camera");
        setStatus("scanning");
        await codeReader.decodeFromVideoDevice(rear.deviceId, videoRef.current, (result) => {
          if (cancelled || detectedRef.current || !result) return;
          detectedRef.current = true;
          codeReader.reset();
          setStatus("found");
          setTimeout(() => { if (!cancelled) onDetected(result.getText()); }, 700);
        });
      } catch {
        if (!cancelled) setStatus("manual");
      }
    }

    start();
    return () => {
      cancelled = true;
      readerRef.current?.reset();
    };
  }, [onDetected]);

  async function handleManualSubmit() {
    const code = manualBarcode.trim();
    if (!code) return;
    readerRef.current?.reset();
    setLookingUp(true);
    setStatus("found");
    setTimeout(() => onDetected(code), 700);
  }

  const showManual = status === "manual" || status === "scanning";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.96)", backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "24px",
      overflowY: "auto",
    }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "#c8a96e", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "4px" }}>Barcode Scanner</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#f5f5f0", fontFamily: "Georgia, serif" }}>
              {status === "found" ? "Got it!" : status === "loading" ? "Starting up…" : "Scan or enter barcode"}
            </div>
          </div>
          <button onClick={onClose} style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#2c2c2e", border: "1px solid #3a3a3c", color: "#f5f5f0", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div style={{ background: "#1c1c1e", borderRadius: "20px", height: "240px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", border: "1px solid #2c2c2e" }}>
            <div style={{ fontSize: "32px" }}>📷</div>
            <div style={{ color: "#8e8e93", fontSize: "14px" }}>Loading scanner…</div>
          </div>
        )}

        {/* Camera viewfinder */}
        {(status === "scanning" || status === "manual") && (
          <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", background: "#000", border: "1px solid #2c2c2e", display: status === "loading" ? "none" : "block" }}>
            <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", display: "block", maxHeight: "260px", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "70%", height: "110px", border: "2px solid #c8a96e", borderRadius: "12px", boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}>
                {[
                  { top: -2, left: -2, borderTop: "3px solid #c8a96e", borderLeft: "3px solid #c8a96e" },
                  { top: -2, right: -2, borderTop: "3px solid #c8a96e", borderRight: "3px solid #c8a96e" },
                  { bottom: -2, left: -2, borderBottom: "3px solid #c8a96e", borderLeft: "3px solid #c8a96e" },
                  { bottom: -2, right: -2, borderBottom: "3px solid #c8a96e", borderRight: "3px solid #c8a96e" },
                ].map((s, i) => <div key={i} style={{ position: "absolute", width: "18px", height: "18px", borderRadius: "2px", ...s }} />)}
              </div>
            </div>
            {status === "manual" && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#f5c518", fontSize: "13px", fontWeight: 600, textAlign: "center", padding: "16px" }}>Camera auto-detect unavailable in Safari — use manual entry below</div>
              </div>
            )}
          </div>
        )}

        {/* Manual barcode entry — always visible when scanning or manual */}
        {showManual && (
          <div style={{ marginTop: "20px", background: "#1c1c1e", borderRadius: "20px", padding: "20px", border: "1px solid #2c2c2e" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#8e8e93", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "10px" }}>
              Manual entry — type barcode number
            </div>
            <div style={{ fontSize: "12px", color: "#48484a", marginBottom: "12px" }}>
              Find the digits printed directly under the barcode lines on the product
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="e.g. 012345678901"
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
                style={{
                  flex: 1, background: "#2c2c2e", border: "1px solid #3a3a3c",
                  borderRadius: "12px", padding: "12px 14px",
                  color: "#f5f5f0", fontSize: "16px", outline: "none",
                  fontFamily: "monospace", letterSpacing: "0.05em",
                }}
              />
              <button onClick={handleManualSubmit} disabled={!manualBarcode.trim() || lookingUp} style={{
                padding: "12px 18px", borderRadius: "12px",
                background: manualBarcode.trim() ? "#c8a96e" : "#2c2c2e",
                border: "none", color: manualBarcode.trim() ? "#111" : "#48484a",
                fontSize: "14px", fontWeight: 700, cursor: manualBarcode.trim() ? "pointer" : "default",
                whiteSpace: "nowrap", transition: "all 0.15s",
              }}>Look up</button>
            </div>
          </div>
        )}

        {/* Found */}
        {status === "found" && (
          <div style={{ background: "#34c75910", border: "1px solid #34c75940", borderRadius: "20px", height: "180px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <div style={{ fontSize: "44px" }}>✅</div>
            <div style={{ color: "#34c759", fontSize: "15px", fontWeight: 700 }}>Barcode found</div>
            <div style={{ color: "#6e6e73", fontSize: "13px" }}>Looking up product…</div>
          </div>
        )}
      </div>
    </div>
  );
}
