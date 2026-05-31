import { Link } from "react-router-dom";
import { useIsMobile } from "../lib/useMediaQuery";

const accent = "#C8A96E";
const dark   = "#111111";

/* ── tiny helpers ─────────────────────────────────────────────── */
const A = ({ to, style, children }) => (
  <Link to={to} style={{ textDecoration:"none", ...style }}>{children}</Link>
);
const Tag = ({ children, light }) => (
  <span style={{
    display:"inline-block", padding:"4px 12px", borderRadius:999,
    background: light ? "#F5EFE6" : "#111",
    color: light ? accent : "#fff",
    fontSize:12, fontWeight:600, letterSpacing:"0.04em",
  }}>{children}</span>
);

/* ── data ─────────────────────────────────────────────────────── */
const AGENTS = [
  {
    icon:"✈️", title:"AI Administrator",
    sub:"Telegram Booking Bot",
    desc:"Answers clients 24/7 in their language via Telegram. Books appointments, handles cancellations, sends reminders. Saves 3+ hours daily.",
    badge:"Live now",
  },
  {
    icon:"📱", title:"AI Marketer",
    sub:"Instagram & Reels",
    desc:"Generates content ideas, captions and hashtag sets tailored to your salon. Posts on schedule without lifting a finger.",
    badge:"Coming soon",
  },
  {
    icon:"📊", title:"AI Analyst",
    sub:"Revenue Intelligence",
    desc:"Spots slow days, top clients and under-used stylists. Gives a plain-English briefing every Monday morning.",
    badge:"Coming soon",
  },
  {
    icon:"🌐", title:"AI Receptionist",
    sub:"Website Chat Widget",
    desc:"Embedded booking chat for your website. Qualifies visitors, collects contact info and fills your calendar automatically.",
    badge:"Live now",
  },
];

const COMPARE = [
  ["Booking commissions",  "0%",    "2 – 20%"],
  ["Monthly flat fee",     "From $19","$30 – $100+"],
  ["AI employees",         "✓ included","✗ none"],
  ["AI messaging bot",     "✓ built-in","✗ extra"],
  ["Your client data",     "✓ yours","✗ platform owns"],
  ["No lock-in",           "✓ export anytime","✗ locked in"],
];

const STEPS = [
  { n:"01", t:"Connect in 2 min", d:"Sign in with Google. Set up your salon profile — services, stylists, working hours." },
  { n:"02", t:"Activate AI agents", d:"Enable Telegram bot, website chat widget. Create a bot in @BotFather, paste your token — done in 2 minutes." },
  { n:"03", t:"Watch it run", d:"AI books appointments, sends reminders, answers questions. You focus on clients." },
];

const PLANS = [
  { name:"Solo",       price:19,  desc:"One stylist, full AI stack.", features:["1 stylist","AI chatbot","Telegram bot","Reminders"] },
  { name:"Small",      price:49,  desc:"Growing team, one location.", features:["Up to 5 stylists","All Solo features","Analytics","Priority support"] },
  { name:"Pro",        price:99,  desc:"Established salon, full power.", features:["Up to 15 stylists","All Small features","AI Marketer","Custom domain"], hot:true },
  { name:"Enterprise", price:199, desc:"Multi-location, custom setup.", features:["Unlimited stylists","All Pro features","Dedicated onboarding","SLA"] },
];

/* ── component ────────────────────────────────────────────────── */
export default function Landing() {
  const ff = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  const isMobile = useIsMobile();

  return (
    <main style={{ minHeight:"100vh", background:"#fff", color:dark, fontFamily:ff }}>

      {/* ── NAV ── */}
      <nav style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid #F0F0F0",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding: isMobile ? "0 16px" : "0 32px", height:60,
      }}>
        <span style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.03em" }}>SalonAI</span>
        <div style={{ display:"flex", gap:8 }}>
          <A to="/login" style={{
            padding:"8px 14px", borderRadius:999, border:"1px solid #E8E8E8",
            color:dark, fontSize:14, fontWeight:500,
          }}>Log in</A>
          <A to="/login" style={{
            padding:"8px 14px", borderRadius:999,
            background:dark, color:"#fff", fontSize:14, fontWeight:600,
          }}>{isMobile ? "Start free" : "Get started free →"}</A>
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:"0 auto", padding: isMobile ? "0 16px" : "0 24px" }}>

        {/* ── HERO ── */}
        <section style={{ textAlign:"center", padding:"80px 0 60px" }}>
          <div style={{ marginBottom:20 }}>
            <Tag light>🏆 Zero commissions · AI employees · No hidden fees</Tag>
          </div>

          <h1 style={{
            margin:0, fontSize:"clamp(40px,6vw,72px)",
            fontWeight:700, letterSpacing:"-0.04em", lineHeight:1.05,
          }}>
            Your salon runs itself.<br/>
            <span style={{ color:accent }}>AI employees included.</span>
          </h1>

          <p style={{
            margin:"24px auto 0", maxWidth:580, fontSize:18,
            color:"#555", lineHeight:1.6,
          }}>
            SalonAI cuts out commission-based booking platforms — <strong>zero booking commissions</strong> and gives you
            a Telegram booking bot, AI marketer and revenue analyst — all in one $19/mo flat fee.
          </p>

          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:32 }}>
            <A to="/login" style={{
              padding:"14px 28px", borderRadius:999,
              background:dark, color:"#fff", fontSize:16, fontWeight:600,
              boxShadow:"0 4px 20px rgba(17,17,17,0.18)",
            }}>Start free — no card needed</A>
            <A to="/booking" style={{
              padding:"14px 28px", borderRadius:999,
              border:"1px solid #E0E0E0", color:dark, fontSize:16, fontWeight:500,
            }}>See live booking demo</A>
          </div>

          {/* stats row */}
          <div style={{
            display:"flex", gap:32, justifyContent:"center", flexWrap:"wrap",
            marginTop:48, paddingTop:48, borderTop:"1px solid #F0F0F0",
          }}>
            {[["$0","Booking commissions"],["3+","Hours saved / day"],["24/7","AI answers clients"],["2 min","Setup time"]].map(([n,l])=>(
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:32, fontWeight:700, letterSpacing:"-0.03em", color:accent }}>{n}</div>
                <div style={{ fontSize:13, color:"#888", marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI AGENTS ── */}
        <section style={{ padding:"60px 0" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <p style={{ margin:0, fontSize:12, textTransform:"uppercase", letterSpacing:"0.15em", color:"#999" }}>Your AI team</p>
            <h2 style={{ margin:"10px 0 0", fontSize:"clamp(28px,4vw,44px)", fontWeight:700, letterSpacing:"-0.03em" }}>
              4 AI employees, one flat price
            </h2>
            <p style={{ margin:"10px auto 0", maxWidth:500, color:"#666", fontSize:16 }}>
              Each agent runs autonomously — so you can take more clients instead of answering phones.
            </p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16 }}>
            {AGENTS.map(a => (
              <article key={a.title} style={{
                border:"1px solid #EFEFEF", borderRadius:20, padding:24,
                background:"#fff",
                boxShadow:"0 4px 24px rgba(17,17,17,0.04)",
              }}>
                <div style={{ fontSize:32, marginBottom:12 }}>{a.icon}</div>
                <h3 style={{ margin:0, fontSize:17, fontWeight:700 }}>{a.title}</h3>
                <p style={{ margin:"2px 0 10px", fontSize:12, color:accent, fontWeight:600 }}>{a.sub}</p>
                <p style={{ margin:"0 0 16px", fontSize:14, color:"#555", lineHeight:1.55 }}>{a.desc}</p>
                <Tag light={a.badge === "Live now"}>{a.badge}</Tag>
              </article>
            ))}
          </div>
        </section>

        {/* ── COMPARE vs FRESHA ── */}
        <section style={{ padding:"60px 0" }}>
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <h2 style={{ margin:0, fontSize:"clamp(26px,3.5vw,40px)", fontWeight:700, letterSpacing:"-0.03em" }}>
              Why salons choose SalonAI
            </h2>
            <p style={{ margin:"10px auto 0", maxWidth:480, color:"#666" }}>
              Traditional booking platforms charge commissions on every appointment. SalonAI is $19 flat — forever.
            </p>
          </div>
          <div style={{ maxWidth:680, margin:"0 auto" }}>
            <div style={{
              display:"grid", gridTemplateColumns: isMobile ? "1fr 80px 80px" : "1fr 140px 140px",
              gap:8, padding:"10px 16px", marginBottom:4,
            }}>
              <span />
              <span style={{ textAlign:"center", fontSize:13, fontWeight:700, color:accent }}>SalonAI</span>
              <span style={{ textAlign:"center", fontSize:13, fontWeight:600, color:"#999" }}>Other platforms</span>
            </div>
            {COMPARE.map(([feat, us, them], i) => (
              <div key={feat} style={{
                display:"grid", gridTemplateColumns: isMobile ? "1fr 80px 80px" : "1fr 140px 140px",
                gap:8, padding:"12px 16px",
                background: i%2===0 ? "#FAFAFA" : "#fff",
                borderRadius:10,
              }}>
                <span style={{ fontSize: isMobile ? 13 : 14, color:dark }}>{feat}</span>
                <span style={{ textAlign:"center", fontSize: isMobile ? 13 : 14, fontWeight:600, color: us.startsWith("✓") ? "#22C55E" : dark }}>{us}</span>
                <span style={{ textAlign:"center", fontSize: isMobile ? 13 : 14, color: them.startsWith("✗") ? "#EF4444" : "#888" }}>{them}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ padding:"60px 0" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <h2 style={{ margin:0, fontSize:"clamp(26px,3.5vw,40px)", fontWeight:700, letterSpacing:"-0.03em" }}>
              Up and running in 2 minutes
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ border:"1px solid #EFEFEF", borderRadius:20, padding:24 }}>
                <span style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:"0.05em" }}>{s.n}</span>
                <h3 style={{ margin:"10px 0 8px", fontSize:20, fontWeight:700 }}>{s.t}</h3>
                <p style={{ margin:0, color:"#555", fontSize:14, lineHeight:1.55 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <section style={{ padding:"60px 0" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <p style={{ margin:0, fontSize:12, textTransform:"uppercase", letterSpacing:"0.15em", color:"#999" }}>Pricing</p>
            <h2 style={{ margin:"10px 0 0", fontSize:"clamp(26px,3.5vw,40px)", fontWeight:700, letterSpacing:"-0.03em" }}>
              One flat fee. No commissions. Ever.
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14 }}>
            {PLANS.map(p => (
              <article key={p.name} style={{
                border: p.hot ? `2px solid ${dark}` : "1px solid #EFEFEF",
                borderRadius:20, padding:"24px 20px",
                background: p.hot ? dark : "#fff",
                color: p.hot ? "#fff" : dark,
                position:"relative",
              }}>
                {p.hot && (
                  <div style={{
                    position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)",
                    background:accent, color:"#111", fontSize:11, fontWeight:700,
                    padding:"4px 14px", borderRadius:999, letterSpacing:"0.05em",
                    whiteSpace:"nowrap",
                  }}>MOST POPULAR</div>
                )}
                <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{p.name}</h3>
                <div style={{ display:"flex", alignItems:"baseline", gap:4, margin:"14px 0 4px" }}>
                  <span style={{ fontSize:42, fontWeight:700, letterSpacing:"-0.04em" }}>${p.price}</span>
                  <span style={{ fontSize:14, color: p.hot ? "#AAA" : "#888" }}>/mo</span>
                </div>
                <p style={{ margin:"0 0 16px", fontSize:13, color: p.hot ? "#CCC" : "#666" }}>{p.desc}</p>
                <ul style={{ margin:0, padding:0, listStyle:"none" }}>
                  {p.features.map(f => (
                    <li key={f} style={{
                      fontSize:13, color: p.hot ? "#EEE" : "#444",
                      padding:"5px 0", borderTop: p.hot ? "1px solid #2A2A2A" : "1px solid #F5F5F5",
                    }}>✓ {f}</li>
                  ))}
                </ul>
                <A to="/login" style={{
                  display:"block", textAlign:"center", marginTop:20,
                  padding:"11px 0", borderRadius:999,
                  background: p.hot ? accent : dark,
                  color: p.hot ? dark : "#fff",
                  fontSize:14, fontWeight:600,
                }}>Get started</A>
              </article>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{
          textAlign:"center", padding:"60px 32px",
          background:"linear-gradient(135deg,#111 0%,#1A1A1A 100%)",
          borderRadius:28, margin:"0 0 60px", color:"#fff",
        }}>
          <h2 style={{ margin:0, fontSize:"clamp(28px,4vw,48px)", fontWeight:700, letterSpacing:"-0.03em" }}>
            Ready to fire your old scheduler?
          </h2>
          <p style={{ margin:"14px auto 0", maxWidth:460, color:"#AAA", fontSize:16 }}>
            Join salons ditching commission fees. No hidden costs. AI handles bookings. You keep 100% of revenue.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:28 }}>
            <A to="/login" style={{
              padding:"14px 32px", borderRadius:999,
              background:accent, color:"#111", fontSize:16, fontWeight:700,
            }}>Start free today →</A>
            <A to="/booking" style={{
              padding:"14px 32px", borderRadius:999,
              border:"1px solid #333", color:"#EEE", fontSize:16, fontWeight:500,
            }}>See booking demo</A>
          </div>
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop:"1px solid #F0F0F0", padding: isMobile ? "24px 16px" : "24px 32px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexWrap:"wrap", gap:12, color:"#999", fontSize:13,
      }}>
        <span style={{ fontWeight:600, color:dark }}>SalonAI</span>
        <span>Zero commissions · AI-powered · Built for salons</span>
        <div style={{ display:"flex", gap:16 }}>
          <A to="/login" style={{ color:"#999" }}>Login</A>
          <A to="/booking" style={{ color:"#999" }}>Demo</A>
        </div>
      </footer>
    </main>
  );
}
