// src/components/BarcodeScanner.jsx
// Uses native iOS camera via file input — most reliable approach for Safari
// Falls back to manual entry if image decode fails
import { useRef, useState } from "react";
import { lookupBarcode } from "../barcodeLookup";

// Dynamically load ZXing from CDN to decode barcode from captured image
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

async function decodeBarcodeFromFile(file) {
  try {
    const ZXing = await loadZxing();
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const reader = new ZXing.BrowserMultiFormatReader();
    const result = reader.decodeFromCanvas(canvas);
    return result?.getText() || null;
  } catch {
    return null;
  }
}

export default function BarcodeScanner({ onDetected, onClose }) {
  const fileInputRef = useRef(null);
  const [status, setStatus]         = useState("idle"); // idle | decoding | found | notfound
  const [manualBarcode, setManualBarcode] = useState("");
  const [preview, setPreview]       = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setStatus("decoding");

    const barcode = await decodeBarcodeFromFile(file);

    if (barcode) {
      setStatus("found");
      setTimeout(() => onDetected(barcode), 800);
    } else {
      setStatus("notfound");
    }
  }

  function handleManualSubmit() {
    const code = manualBarcode.trim();
    if (!code) return;
    setStatus("found");
    setTimeout(() => onDetected(code), 700);
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(0,0,0,0.96)", backdropFilter:"blur(20px)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"24px", overflowY:"auto",
    }}>
      {/* Hidden file input — triggers native iOS camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display:"none" }}
      />

      <div style={{ width:"100%", maxWidth:"440px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
          <div>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.14em", color:"#c8a96e", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"4px" }}>Barcode Scanner</div>
            <div style={{ fontSize:"22px", fontWeight:800, color:"#f5f5f0", fontFamily:"Georgia, serif" }}>
              {status === "found" ? "Got it!" : status === "decoding" ? "Reading barcode…" : "Scan or enter barcode"}
            </div>
          </div>
          <button onClick={onClose} style={{ width:"40px", height:"40px", borderRadius:"50%", background:"#2c2c2e", border:"1px solid #3a3a3c", color:"#f5f5f0", fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Camera button */}
        {(status === "idle" || status === "notfound") && (
          <button
            onClick={() => { setStatus("idle"); setPreview(null); fileInputRef.current?.click(); }}
            style={{
              width:"100%", padding:"20px", borderRadius:"20px", marginBottom:"16px",
              background:"linear-gradient(135deg, #1a2f4a, #0d1f33)",
              border:"1px solid #2a5a8c",
              color:"#4a9edd", fontSize:"16px", fontWeight:700, cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:"10px",
            }}>
            <span style={{ fontSize:"48px" }}>📷</span>
            <span>Open Camera</span>
            <span style={{ fontSize:"12px", color:"#6e6e73", fontWeight:400 }}>Takes a photo of the barcode — works in Safari</span>
          </button>
        )}

        {/* Not found warning */}
        {status === "notfound" && (
          <div style={{ padding:"12px 16px", borderRadius:"12px", marginBottom:"16px", background:"#f5c51815", border:"1px solid #f5c51840", color:"#f5c518", fontSize:"13px", lineHeight:1.5 }}>
            ⚠ Couldn't read the barcode from that photo. Try again with better lighting, or enter the number manually below.
          </div>
        )}

        {/* Decoding state */}
        {status === "decoding" && (
          <div style={{ background:"#1c1c1e", border:"1px solid #2c2c2e", borderRadius:"20px", padding:"24px", marginBottom:"16px", textAlign:"center" }}>
            {preview && <img src={preview} alt="captured" style={{ width:"100%", borderRadius:"12px", marginBottom:"16px", maxHeight:"200px", objectFit:"cover" }} />}
            <div style={{ color:"#8e8e93", fontSize:"14px" }}>Reading barcode…</div>
          </div>
        )}

        {/* Found */}
        {status === "found" && (
          <div style={{ background:"#34c75910", border:"1px solid #34c75940", borderRadius:"20px", padding:"32px", textAlign:"center", marginBottom:"16px" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>✅</div>
            <div style={{ color:"#34c759", fontSize:"16px", fontWeight:700 }}>Barcode detected</div>
            <div style={{ color:"#6e6e73", fontSize:"13px", marginTop:"6px" }}>Looking up product…</div>
          </div>
        )}

        {/* Divider */}
        {status !== "found" && status !== "decoding" && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
            <div style={{ flex:1, height:"1px", background:"#2c2c2e" }} />
            <span style={{ fontSize:"11px", color:"#48484a", fontFamily:"monospace" }}>or enter barcode manually</span>
            <div style={{ flex:1, height:"1px", background:"#2c2c2e" }} />
          </div>
        )}

        {/* Manual entry — always available */}
        {status !== "found" && status !== "decoding" && (
          <div style={{ background:"#1c1c1e", border:"1px solid #2c2c2e", borderRadius:"20px", padding:"20px" }}>
            <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", color:"#8e8e93", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"8px" }}>
              Type barcode number
            </div>
            <div style={{ fontSize:"12px", color:"#48484a", marginBottom:"12px", lineHeight:1.5 }}>
              The digits printed directly under the barcode lines on the product packaging.
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="e.g. 012345678901"
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
                autoFocus
                style={{
                  flex:1, background:"#2c2c2e", border:"1px solid #3a3a3c",
                  borderRadius:"12px", padding:"12px 14px",
                  color:"#f5f5f0", fontSize:"16px", outline:"none",
                  fontFamily:"monospace", letterSpacing:"0.05em",
                }}
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualBarcode.trim()}
                style={{
                  padding:"12px 18px", borderRadius:"12px",
                  background: manualBarcode.trim() ? "#c8a96e" : "#2c2c2e",
                  border:"none", color: manualBarcode.trim() ? "#111" : "#48484a",
                  fontSize:"14px", fontWeight:700,
                  cursor: manualBarcode.trim() ? "pointer" : "default",
                  whiteSpace:"nowrap", transition:"all 0.15s",
                }}>
                Look up
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
