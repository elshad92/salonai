import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useIsMobile } from "../lib/useMediaQuery";

export default function Clients() {
  const isMobile = useIsMobile();
  const [appointments, setAppointments] = useState([]);
  const [loyalty, setLoyalty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("visits"); // "visits" | "recent" | "name"

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: salon } = await supabase.from("salons").select("id").eq("owner_id", user.id).single();
      if (!salon) { setLoading(false); return; }

      const [apptRes, loyaltyRes] = await Promise.all([
        supabase.from("appointments").select("name, phone, service, date, time, master")
          .eq("salon_id", salon.id).order("date", { ascending: false }),
        supabase.from("loyalty").select("*").eq("salon_id", salon.id).order("visits", { ascending: false }),
      ]);

      setAppointments(apptRes.data || []);
      setLoyalty(loyaltyRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const clients = useMemo(() => {
    // Merge loyalty data with appointments history
    const map = {};

    (loyalty || []).forEach(l => {
      map[l.client_phone] = {
        phone: l.client_phone,
        name: l.client_name || "Unknown",
        visits: l.visits,
        lastVisit: l.last_visit,
        services: [],
      };
    });

    (appointments || []).forEach(a => {
      if (!a.phone) return;
      if (!map[a.phone]) {
        map[a.phone] = { phone: a.phone, name: a.name || "Unknown", visits: 0, lastVisit: a.date, services: [] };
      }
      if (a.service && !map[a.phone].services.includes(a.service)) {
        map[a.phone].services.push(a.service);
      }
      if (!map[a.phone].lastVisit || a.date > map[a.phone].lastVisit) {
        map[a.phone].lastVisit = a.date;
      }
      if (!map[a.phone].visits) map[a.phone].visits = 1;
    });

    return Object.values(map);
  }, [appointments, loyalty]);

  const filtered = useMemo(() => {
    let list = clients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === "visits") return b.visits - a.visits;
      if (sortBy === "recent") return (b.lastVisit || "").localeCompare(a.lastVisit || "");
      return a.name.localeCompare(b.name);
    });
  }, [clients, search, sortBy]);

  function exportCSV() {
    const rows = [["Name", "Phone", "Visits", "Last Visit", "Services used"]];
    filtered.forEach(c => {
      rows.push([c.name, c.phone, c.visits, c.lastVisit || "", c.services.join("; ")]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const pad = isMobile ? 16 : 32;

  return (
    <main style={{
      minHeight: "100vh", background: "#FFF", color: "#111",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: pad,
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <header style={{
          display: "flex", justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 14, marginBottom: 24,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 600, letterSpacing: "-0.02em" }}>
              👥 Clients
            </h1>
            <p style={{ margin: "8px 0 0", color: "#555", fontSize: 15 }}>
              {clients.length} total · {clients.filter(c => c.visits > 1).length} returning
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/dashboard" style={{
              textDecoration: "none", padding: "10px 14px",
              borderRadius: 999, border: "1px solid #EAEAEA",
              color: "#111", fontSize: 14, fontWeight: 500,
            }}>← Dashboard</Link>
            <button onClick={exportCSV} disabled={filtered.length === 0} style={{
              padding: "10px 16px", borderRadius: 999,
              background: "#111", border: "none",
              color: "#FFF", fontSize: 14, fontWeight: 600,
              cursor: filtered.length === 0 ? "default" : "pointer",
              opacity: filtered.length === 0 ? 0.4 : 1,
            }}>⬇ Export CSV</button>
          </div>
        </header>

        {/* Search + sort */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            style={{
              flex: 1, minWidth: 200, height: 44, borderRadius: 12,
              border: "1px solid #E0E0E0", padding: "0 14px", fontSize: 14,
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "visits", label: "Most visits" },
              { id: "recent", label: "Recent" },
              { id: "name",   label: "A–Z" },
            ].map(s => (
              <button key={s.id} onClick={() => setSortBy(s.id)} style={{
                padding: "0 14px", height: 44, borderRadius: 12,
                border: "1px solid " + (sortBy === s.id ? "#111" : "#E0E0E0"),
                background: sortBy === s.id ? "#111" : "#FFF",
                color: sortBy === s.id ? "#FFF" : "#555",
                fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <p style={{ margin: 0, color: "#999" }}>Loading clients…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", border: "1px dashed #EAEAEA", borderRadius: 20 }}>
            <p style={{ margin: 0, fontSize: 24 }}>👥</p>
            <p style={{ margin: "12px 0 0", color: "#666" }}>
              {search ? "No clients match your search." : "No clients yet."}
            </p>
            {!search && <p style={{ margin: "8px 0 0", color: "#AAA", fontSize: 13 }}>Clients appear here after their first booking.</p>}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((c, i) => (
              <div key={c.phone + i} style={{
                border: "1px solid #EFEFEF", borderRadius: 16,
                padding: isMobile ? "14px 16px" : "16px 20px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 120px 140px 160px",
                alignItems: "center", gap: isMobile ? 8 : 14,
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{c.name}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "#888" }}>{c.phone}</p>
                  {c.services.length > 0 && (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#AAA" }}>
                      {c.services.slice(0, 3).join(" · ")}{c.services.length > 3 ? " …" : ""}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: isMobile ? "left" : "center" }}>
                  <span style={{
                    display: "inline-block", padding: "4px 10px", borderRadius: 999,
                    background: c.visits > 3 ? "#FFF8ED" : "#F5F5F5",
                    border: "1px solid " + (c.visits > 3 ? "#F0DDB5" : "#E0E0E0"),
                    fontSize: 12, fontWeight: 600,
                    color: c.visits > 3 ? "#C8A96E" : "#555",
                  }}>
                    {c.visits} visit{c.visits !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ textAlign: isMobile ? "left" : "center" }}>
                  {c.visits > 1 && (
                    <span style={{ fontSize: 12, background: "#F0FFF4", border: "1px solid #A7F3D0", color: "#065F46", borderRadius: 999, padding: "4px 10px", fontWeight: 500 }}>
                      Returning ✓
                    </span>
                  )}
                </div>
                <div style={{ textAlign: isMobile ? "left" : "right", fontSize: 13, color: "#999" }}>
                  {c.lastVisit
                    ? new Date(c.lastVisit + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
