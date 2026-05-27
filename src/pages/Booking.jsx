import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useIsMobile } from "../lib/useMediaQuery";

export default function Booking() {
  const isMobile = useIsMobile();
  const services = [
    { id: "haircut", label: "Haircut", duration: "45 min" },
    { id: "color", label: "Color & Tone", duration: "120 min" },
    { id: "blowout", label: "Blowout", duration: "60 min" },
    { id: "keratin", label: "Keratin Treatment", duration: "90 min" },
  ];

  const masters = [
    { id: "emma", name: "Emma Wilson", role: "Senior Stylist" },
    { id: "olivia", name: "Olivia Brown", role: "Color Specialist" },
    { id: "mia", name: "Mia Johnson", role: "Treatment Expert" },
  ];

  const times = ["09:30", "11:00", "13:15", "15:00", "16:30", "18:00"];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState(services[0].id);
  const [master, setMaster] = useState(masters[0].id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(times[0]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const inputStyle = {
    height: 46, borderRadius: 12, border: "1px solid #EAEAEA",
    background: "#FFF", padding: "0 12px", fontSize: 14, color: "#111", width: "100%",
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim() || !phone.trim() || !date) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.from("appointments").insert({
      name: name.trim(), phone: phone.trim(),
      service, master, date, time,
      created_at: new Date().toISOString(),
    });

    if (error) {
      setErrorMessage(error.message || "Failed to save booking.");
      setLoading(false);
      return;
    }

    setSuccessMessage("Booking confirmed! We'll see you soon. ✅");
    setName(""); setPhone(""); setDate("");
    setTime(times[0]); setService(services[0].id); setMaster(masters[0].id);
    setLoading(false);
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#FFFFFF", color: "#111111",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: isMobile ? 16 : 32,
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 24, flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 600, letterSpacing: "-0.02em" }}>Book Appointment</h1>
            <p style={{ margin: "8px 0 0", color: "#555", fontSize: 15 }}>Quick booking without registration</p>
          </div>
          <Link to="/dashboard" style={{
            textDecoration: "none", color: "#111", border: "1px solid #EAEAEA",
            borderRadius: 999, padding: "10px 14px", fontSize: 14, fontWeight: 500,
          }}>← Dashboard</Link>
        </header>

        <section style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.7fr) minmax(280px, 1fr)",
          gap: 14,
        }}>
          <article style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: isMobile ? 18 : 22, background: "#FFF" }}>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#666" }}>Service</span>
                <select value={service} onChange={e => setService(e.target.value)} style={inputStyle}>
                  {services.map(item => (
                    <option key={item.id} value={item.id}>{item.label} · {item.duration}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#666" }}>Master</span>
                <select value={master} onChange={e => setMaster(e.target.value)} style={inputStyle}>
                  {masters.map(item => (
                    <option key={item.id} value={item.id}>{item.name} · {item.role}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#666" }}>Date</span>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#666" }}>Time</span>
                  <select value={time} onChange={e => setTime(e.target.value)} style={inputStyle}>
                    {times.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#666" }}>Your name</span>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required style={inputStyle} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#666" }}>Phone</span>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" required style={inputStyle} />
                </label>
              </div>

              <button type="submit" disabled={loading} style={{
                marginTop: 4, height: 50, borderRadius: 12,
                border: "1px solid #BFA164", background: "#C8A96E",
                color: "#111", fontSize: 15, fontWeight: 600,
                cursor: "pointer", opacity: loading ? 0.7 : 1,
              }}>
                {loading ? "Saving…" : "Confirm Booking"}
              </button>

              {errorMessage && (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "#FFF5F5", border: "1px solid #FECACA" }}>
                  <p style={{ margin: 0, color: "#C62828", fontSize: 14 }}>{errorMessage}</p>
                </div>
              )}
              {successMessage && (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "#F0FFF4", border: "1px solid #A7F3D0" }}>
                  <p style={{ margin: 0, color: "#065F46", fontSize: 14 }}>{successMessage}</p>
                </div>
              )}
            </form>
          </article>

          <aside style={{ border: "1px solid #EFEFEF", borderRadius: 20, padding: 20, background: "#FFF", alignSelf: "start" }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Booking Notes</h2>
            <p style={{ margin: "8px 0 14px", color: "#666", fontSize: 14 }}>No account required. We only need your contact details.</p>
            <div style={{ border: "1px solid #EFE7D6", background: "#FCFAF5", borderRadius: 14, padding: 14, fontSize: 14, lineHeight: 1.55 }}>
              Please arrive 10 minutes early. If your plans change, call us at least 2 hours before the appointment.
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
