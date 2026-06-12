// src/components/ItemModal.jsx
import { useState } from "react";
import { lookupBarcode } from "../barcodeLookup";
import BarcodeScanner from "./BarcodeScanner";

const CATEGORIES = ["Grains & Pasta","Canned Goods","Spices & Condiments","Snacks","Baking","Beverages","Frozen","Produce","Dairy","Other"];
const EMPTY = { name:"", category:"Other", quantity:1, unit:"units", expiry:"", noExpiry:false, location:"", notes:"" };

export default function ItemModal({ item, locations = [], onSave, onClose }) {
  const locationNames = locations.map(l => l.name);
  const [form, setForm]           = useState(item || { ...EMPTY, location: locationNames[0] || "" });
  const [noExpiry, setNoExpiry]   = useState(item?.noExpiry || false);
  const [scanning, setScanning]   = useState(false);
  const [looking, setLooking]     = useState(false);
  const [lookupMsg, setLookupMsg] = useState(null);
  const [productImg, setProductImg] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleBarcode(barcode) {
    setScanning(false);
    setLooking(true);
    setLookupMsg(null);
    const result = await lookupBarcode(barcode);
    setLooking(false);
    if (result.found) {
      setForm(f => ({ ...f, name: result.name || f.name, category: result.category || f.category }));
      if (result.imageUrl) setProductImg(result.imageUrl);
      setLookupMsg({ type:"success", text:`Found: ${result.name}${result.brand ? ` by ${result.brand}` : ""}` });
    } else {
      setLookupMsg({ type:"error", text:`Barcode not found — fill in details manually.` });
    }
  }

  const label = {
    display:"block", fontSize:"11px", fontWeight:700,
    letterSpacing:"0.08em", color:"#8e8e93", textTransform:"uppercase",
    marginBottom:"6px", fontFamily:"monospace",
  };
  const input = {
    width:"100%", boxSizing:"border-box",
    background:"#2c2c2e", border:"1px solid #3a3a3c",
    borderRadius:"12px", padding:"11px 14px",
    color:"#f5f5f0", fontSize:"15px", outline:"none", colorScheme:"dark",
  };

  return (
    <>
      {scanning && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />}

      <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(12px)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"20px", overflowY:"auto" }} onClick={onClose}>
        <div style={{ background:"#1c1c1e", border:"1px solid #2c2c2e", borderRadius:"24px", padding:"28px", width:"100%", maxWidth:"480px", boxShadow:"0 40px 80px rgba(0,0,0,0.6)", margin:"auto" }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"24px" }}>
            {productImg && <img src={productImg} alt="" style={{ width:"48px", height:"48px", borderRadius:"10px", objectFit:"cover", background:"#fff" }} />}
            <div>
              <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", color:"#c8a96e", textTransform:"uppercase", fontFamily:"monospace", marginBottom:"4px" }}>
                {item ? "Edit Item" : "Add to Pantry"}
              </div>
              <h2 style={{ margin:0, fontSize:"20px", fontFamily:"Georgia, serif", color:"#f5f5f0", fontWeight:800 }}>
                {item ? item.name : "New Item"}
              </h2>
            </div>
          </div>

          {/* Scan button */}
          {!item && (
            <button onClick={() => setScanning(true)} disabled={looking} style={{
              width:"100%", padding:"13px", borderRadius:"14px", marginBottom:"16px",
              background: looking ? "#2c2c2e" : "rgba(10,132,255,0.15)",
              border:`1px solid ${looking ? "#3a3a3c" : "rgba(10,132,255,0.4)"}`,
              color: looking ? "#6e6e73" : "#0a84ff",
              fontSize:"15px", fontWeight:700, cursor: looking ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
            }}>
              <span style={{ fontSize:"20px" }}>📷</span>
              {looking ? "Looking up product…" : "Scan Barcode"}
            </button>
          )}

          {/* Lookup message */}
          {lookupMsg && (
            <div style={{
              padding:"10px 14px", borderRadius:"10px", marginBottom:"16px", fontSize:"13px",
              background: lookupMsg.type === "success" ? "#34c75915" : "#ff3b3015",
              border:`1px solid ${lookupMsg.type === "success" ? "#34c75940" : "#ff3b3040"}`,
              color: lookupMsg.type === "success" ? "#34c759" : "#ff3b30",
            }}>{lookupMsg.text}</div>
          )}

          {/* Divider */}
          {!item && (
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
              <div style={{ flex:1, height:"1px", background:"#2c2c2e" }} />
              <span style={{ fontSize:"11px", color:"#48484a", fontFamily:"monospace" }}>or fill in manually</span>
              <div style={{ flex:1, height:"1px", background:"#2c2c2e" }} />
            </div>
          )}

          {/* Name */}
          <div style={{ marginBottom:"16px" }}>
            <label style={label}>Item Name</label>
            <input type="text" value={form.name} placeholder="e.g. Arborio Rice"
              onChange={e => set("name", e.target.value)} style={input} />
          </div>

          {/* Qty + Unit */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
            <div>
              <label style={label}>Quantity</label>
              <input type="number" min="0" value={form.quantity}
                onChange={e => set("quantity", parseFloat(e.target.value)||0)}
                style={{ ...input, fontFamily:"monospace" }} />
            </div>
            <div>
              <label style={label}>Unit</label>
              <input type="text" value={form.unit} placeholder="cans, kg, boxes…"
                onChange={e => set("unit", e.target.value)} style={input} />
            </div>
          </div>

          {/* Expiry */}
          <div style={{ marginBottom:"16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
              <label style={{ ...label, marginBottom:0 }}>Expiry Date</label>
              <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", userSelect:"none" }}
                onClick={() => {
                  const next = !noExpiry;
                  setNoExpiry(next);
                  if (next) set("expiry", "");
                }}>
                <div style={{
                  width:"20px", height:"20px", borderRadius:"6px", flexShrink:0,
                  background: noExpiry ? "#c8a96e" : "#2c2c2e",
                  border: `2px solid ${noExpiry ? "#c8a96e" : "#48484a"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.15s",
                }}>
                  {noExpiry && <span style={{ fontSize:"12px", color:"#111", fontWeight:800, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontSize:"12px", fontWeight:600, color: noExpiry ? "#c8a96e" : "#6e6e73" }}>No expiration</span>
              </label>
            </div>
            {noExpiry ? (
              <div style={{ ...input, display:"flex", alignItems:"center", gap:"8px", color:"#6e6e73", background:"#1c1c1e", border:"1px solid #2c2c2e" }}>
                <span style={{ fontSize:"14px" }}>∞</span>
                <span style={{ fontSize:"14px" }}>Does not expire</span>
              </div>
            ) : (
              <input type="date" value={form.expiry}
                onChange={e => set("expiry", e.target.value)}
                style={{ ...input, fontFamily:"monospace" }} />
            )}
          </div>

          {/* Category + Location */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
            <div>
              <label style={label}>Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={input}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Location</label>
              <select value={form.location} onChange={e => set("location", e.target.value)} style={input}>
                {locationNames.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom:"24px" }}>
            <label style={label}>Notes</label>
            <input type="text" value={form.notes} placeholder="Optional note…"
              onChange={e => set("notes", e.target.value)} style={input} />
          </div>

          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={onClose} style={{ flex:1, padding:"13px", borderRadius:"12px", background:"#2c2c2e", border:"none", color:"#8e8e93", fontSize:"15px", fontWeight:600, cursor:"pointer" }}>Cancel</button>
            <button onClick={() => form.name.trim() && onSave({ ...form, quantity:Number(form.quantity), noExpiry, expiry: noExpiry ? "" : form.expiry })} style={{ flex:2, padding:"13px", borderRadius:"12px", background:"linear-gradient(135deg, #0a84ff, #0066cc)", border:"none", color:"#fff", fontSize:"15px", fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(10,132,255,0.4)" }}>
              {item ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
