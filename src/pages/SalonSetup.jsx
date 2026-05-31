import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";

const DEFAULT_SERVICES = [
  { name: "Haircut", duration: "45 min" },
  { name: "Color & Tone", duration: "120 min" },
  { name: "Blowout", duration: "60 min" },
  { name: "Keratin Treatment", duration: "90 min" },
];
const DEFAULT_MASTERS = [
  { name: "Emma Wilson" },
  { name: "Olivia Brown" },
  { name: "Mia Johnson" },
];

export default function SalonSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salon, setSalon] = useState(null);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", phone: "", address: "",
    google_maps_url: "", accent_color: "#C8A96E",
  });
  const [workingHours, setWorkingHours] = useState({ start: "09:00", end: "18:00" });
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [masters, setMasters] = useState(DEFAULT_MASTERS);
  const [newService, setNewService] = useState({ name: "", duration: "" });
  const [newMaster, setNewMaster] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedSlug, setSavedSlug] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("salons").select("*").eq("owner_id", user.id).single();
      if (data) {
        setSalon(data);
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          description: data.description || "",
          phone: data.phone || "",
          address: data.address || "",
          google_maps_url: data.google_maps_url || "",
          accent_color: data.accent_color || "#C8A96E",
        });
        if (data.services?.length) setServices(data.services);
        if (data.masters?.length) setMasters(data.masters);
        if (data.working_hours) setWorkingHours({ start: data.working_hours.start || "09:00", end: data.working_hours.end || "18:00" });
      }
      setLoading(false);
    }
    load();
  }, [navigate]);

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSavedSlug("");
    const { data: { user } } = await supabase.auth.getUser();
    const slug = form.slug || slugify(form.name);
    const payload = { ...form, slug, owner_id: user.id, services, masters, working_hours: workingHours };

    let error;
    if (salon) {
      ({ error } = await supabase.from("salons").update(payload).eq("id", salon.id));
    } else {
      ({ error } = await supabase.from("salons").insert(payload));
    }
    if (!error) {
      if (!salon) trackEvent("salon_created");
      setSavedSlug(slug);
      if (!salon) setSalon({ id: "saved" });
    } else {
      setSaveError(error.message);
    }
    setSaving(false);
  }

  function addService() {
    if (!newService.name.trim()) return;
    setServices(s => [...s, { name: newService.name.trim(), duration: newService.duration.trim() || "60 min" }]);
    setNewService({ name: "", duration: "" });
  }
  function removeService(i) { setServices(s => s.filter((_, idx) => idx !== i)); }

  function addMaster() {
    if (!newMaster.trim()) return;
    setMasters(m => [...m, { name: newMaster.trim() }]);
    setNewMaster("");
  }
  function removeMaster(i) { setMasters(m => m.filter((_, idx) => idx !== i)); }

  const inp = { width: "100%", height: 44, borderRadius: 12, border: "1px solid #E0E0E0", padding: "0 12px", fontSize: 14, marginTop: 6, boxSizing: "border-box" };
  const lbl = { display: "block", marginBottom: 16 };
  const spn = { fontSize: 13, color: "#555", fontWeight: 500 };
  const tag = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px", borderRadius: 999, background: "#F5F5F5",
    border: "1px solid #E0E0E0", fontSize: 13,
  };
  const removeBtn = { background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 16, lineHeight: 1, padding: 0 };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#FFF", fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', padding: 32 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Salon Settings</h1>
          <Link to="/dashboard" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 999, border: "1px solid #EAEAEA", color: "#111", fontSize: 14 }}>Back</Link>
        </header>

        <form onSubmit={handleSave}>
          {/* Basic Info */}
          <section style={{ border: "1px solid #EAEAEA", borderRadius: 20, padding: 24, marginBottom: 16 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 600 }}>Basic Info</h2>

            <label style={lbl}><span style={spn}>Salon Name *</span>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} required style={inp} /></label>

            <label style={lbl}><span style={spn}>URL Slug</span>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={inp} placeholder="glamour-studio" />
              <span style={{ fontSize: 12, color: "#999", marginTop: 4, display: "block" }}>
                Booking link: <strong>{window.location.origin}/s/{form.slug || "your-salon"}</strong>
              </span>
            </label>

            <label style={lbl}><span style={spn}>Description</span>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inp} placeholder="Premium hair salon in downtown NYC" /></label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <label><span style={spn}>Phone</span>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} placeholder="+1 555 123-4567" /></label>
              <label><span style={spn}>Brand Color</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <input type="color" value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })}
                    style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid #E0E0E0", padding: 2, cursor: "pointer" }} />
                  <input value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })}
                    style={{ ...inp, marginTop: 0, flex: 1 }} placeholder="#C8A96E" />
                </div>
              </label>
            </div>

            <label style={lbl}><span style={spn}>Address</span>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} placeholder="123 Main St, New York" /></label>

            <label style={{ ...lbl, marginBottom: 0 }}><span style={spn}>Google Maps Review Link</span>
              <input value={form.google_maps_url} onChange={e => setForm({ ...form, google_maps_url: e.target.value })} style={inp} placeholder="https://g.page/r/..." /></label>
          </section>

          {/* Services */}
          <section style={{ border: "1px solid #EAEAEA", borderRadius: 20, padding: 24, marginBottom: 16 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>Services</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {services.map((s, i) => (
                <span key={i} style={tag}>
                  {s.name} — {s.duration}
                  <button type="button" onClick={() => removeService(i)} style={removeBtn}>×</button>
                </span>
              ))}
              {services.length === 0 && <p style={{ margin: 0, color: "#999", fontSize: 13 }}>No services yet</p>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 8, alignItems: "end" }}>
              <label>
                <span style={spn}>Service name</span>
                <input value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addService())}
                  style={inp} placeholder="Haircut" />
              </label>
              <label>
                <span style={spn}>Duration</span>
                <input value={newService.duration} onChange={e => setNewService(s => ({ ...s, duration: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addService())}
                  style={inp} placeholder="45 min" />
              </label>
              <button type="button" onClick={addService} style={{ height: 44, padding: "0 16px", borderRadius: 12, background: "#111", border: "none", color: "#FFF", fontWeight: 600, cursor: "pointer", fontSize: 14, marginTop: 22 }}>
                + Add
              </button>
            </div>
          </section>

          {/* Masters */}
          <section style={{ border: "1px solid #EAEAEA", borderRadius: 20, padding: 24, marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>Stylists</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {masters.map((m, i) => (
                <span key={i} style={tag}>
                  {m.name}
                  <button type="button" onClick={() => removeMaster(i)} style={removeBtn}>×</button>
                </span>
              ))}
              {masters.length === 0 && <p style={{ margin: 0, color: "#999", fontSize: 13 }}>No stylists yet</p>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
              <label>
                <span style={spn}>Stylist name</span>
                <input value={newMaster} onChange={e => setNewMaster(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addMaster())}
                  style={inp} placeholder="Emma Wilson" />
              </label>
              <button type="button" onClick={addMaster} style={{ height: 44, padding: "0 16px", borderRadius: 12, background: "#111", border: "none", color: "#FFF", fontWeight: 600, cursor: "pointer", fontSize: 14, marginTop: 22 }}>
                + Add
              </button>
            </div>
          </section>

          {/* Working Hours */}
          <section style={{ border: "1px solid #EAEAEA", borderRadius: 20, padding: 24, marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>Working Hours</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>Used by the AI booking bot to suggest available times.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span style={spn}>Opens at</span>
                <input type="time" value={workingHours.start} onChange={e => setWorkingHours(h => ({ ...h, start: e.target.value }))} style={inp} />
              </label>
              <label>
                <span style={spn}>Closes at</span>
                <input type="time" value={workingHours.end} onChange={e => setWorkingHours(h => ({ ...h, end: e.target.value }))} style={inp} />
              </label>
            </div>
          </section>

          <button type="submit" disabled={saving} style={{ width: "100%", height: 50, borderRadius: 14, background: "#C8A96E", border: "none", color: "#FFF", fontSize: 16, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}>
            {saving ? "Saving…" : salon ? "Update Salon" : "Create Salon"}
          </button>

          {savedSlug && (
            <div style={{ marginTop: 14, padding: "16px 20px", borderRadius: 14, background: "#F0FFF4", border: "1px solid #A7F3D0" }}>
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "#065F46" }}>✅ Saved!</p>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#047857" }}>
                Booking link: <strong>{window.location.origin}/s/{savedSlug}</strong>
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.origin + "/s/" + savedSlug); }} style={{ padding: "7px 14px", borderRadius: 10, background: "#065F46", border: "none", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Copy link
                </button>
                <Link to="/dashboard" style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid #A7F3D0", color: "#065F46", fontSize: 13, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  Go to Dashboard →
                </Link>
              </div>
            </div>
          )}

          {saveError && (
            <div style={{ marginTop: 14, padding: "14px 18px", borderRadius: 14, background: "#FFF5F5", border: "1px solid #FECACA" }}>
              <p style={{ margin: 0, fontSize: 14, color: "#C62828" }}>Error: {saveError}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
