import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "./supabase";
import { askGemini } from "./gemini";

const FALLBACK_SERVICES = "Haircut (45 min), Color & Tone (120 min), Blowout (60 min), Keratin Treatment (90 min)";
const FALLBACK_MASTERS = "Emma Wilson (Senior Stylist), Olivia Brown (Color Specialist), Mia Johnson (Treatment Expert)";
const DEFAULT_TIMES = "09:30, 11:00, 13:15, 15:00, 16:30, 18:00";

function buildSystem(salonName, services, masters) {
  const svcList = services?.length
    ? services.map(s => `${s.name}${s.duration ? ` (${s.duration})` : ""}`).join(", ")
    : FALLBACK_SERVICES;
  const masterList = masters?.length
    ? masters.map(m => m.name).join(", ")
    : FALLBACK_MASTERS;
  const name = salonName || "our salon";
  return `You are AI Receptionist at ${name} — a warm, professional salon assistant.
You help clients book appointments through natural conversation.

Available services: ${svcList}.
Available stylists: ${masterList}.
Available times: ${DEFAULT_TIMES}.

Guide the client naturally through: service, stylist, date, time, name, phone.
Be brief (1-3 sentences). Be friendly. Use emojis sparingly.

When you have ALL 6 pieces of info, add this JSON at the end:
###BOOK###{"service":"...","master":"...","date":"YYYY-MM-DD","time":"HH:MM","name":"...","phone":"..."}###END###`;
}

function parseBooking(text) {
  const m = text.match(/###BOOK###(\{.*?\})###END###/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
function clean(text) {
  return text.replace(/###BOOK###.*?###END###/s, "").trim();
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);
  const [salon, setSalon] = useState(null); // null = loading, {} = fallback, {...} = real data
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // Reset salon data when navigating to a different page
  useEffect(() => { setSalon(null); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    if (msgs.length === 0)
      setMsgs([{ r: "bot", t: "Hi! Welcome to our salon 💇 Would you like to book an appointment?" }]);
    if (salon !== null) return;

    async function loadSalon() {
      // On /s/:slug — fetch salon by slug
      const slugMatch = location.pathname.match(/^\/s\/([^/]+)/);
      if (slugMatch) {
        const { data } = await supabase.from("salons")
          .select("name, services, masters")
          .eq("slug", slugMatch[1]).single();
        if (data) { setSalon(data); return; }
      }
      // Try current logged-in owner's salon
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("salons")
          .select("name, services, masters")
          .eq("owner_id", user.id).single();
        if (data) { setSalon(data); return; }
      }
      setSalon({}); // use fallback
    }
    loadSalon();
  }, [open, location.pathname]);

  const system = buildSystem(salon?.name, salon?.services, salon?.masters);

  async function send(e) {
    e.preventDefault();
    const val = input.trim();
    if (!val || loading) return;
    setInput("");
    const updated = [...msgs, { r: "user", t: val }];
    setMsgs(updated);
    setLoading(true);

    const history = updated.map(m => m.r === "user" ? "Client: " + m.t : "Receptionist: " + m.t).join("\n");
    const prompt = history + "\nReceptionist:";
    const reply = await askGemini(prompt, system);

    if (reply) {
      const booking = parseBooking(reply);
      const display = clean(reply) || "Your appointment is confirmed! ✅";
      setMsgs(p => [...p, { r: "bot", t: display }]);
      if (booking && !booked) {
        await supabase.from("appointments").insert({
          name: booking.name, phone: booking.phone,
          service: booking.service, master: booking.master,
          date: booking.date, time: booking.time,
        });
        setBooked(true);
        setMsgs(p => [...p, { r: "bot", t: "✅ Booking saved! See you soon! 🎉" }]);
      }
    } else {
      setMsgs(p => [...p, { r: "bot", t: "Sorry, I'm having a moment. Could you try again?" }]);
    }
    setLoading(false);
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      position:"fixed",bottom:24,right:24,zIndex:9999,
      width:60,height:60,borderRadius:"50%",
      background:"#C8A96E",border:"none",cursor:"pointer",
      boxShadow:"0 4px 20px rgba(200,169,110,0.4)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:26,color:"#FFF",
    }}>💬</button>
  );
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,width:380,height:520,borderRadius:20,overflow:"hidden",border:"1px solid #E8E8E8",boxShadow:"0 12px 48px rgba(0,0,0,0.12)",display:"flex",flexDirection:"column",background:"#FFF",fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'}}>
      <div style={{padding:"14px 18px",background:"#111",color:"#FFF",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontWeight:600,fontSize:15}}>🤖 AI Receptionist</div><div style={{fontSize:11,color:"#AAA",marginTop:2}}>Powered by Gemini AI</div></div>
        <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#888",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{alignSelf:m.r==="user"?"flex-end":"flex-start",maxWidth:"80%",padding:"10px 14px",borderRadius:m.r==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.r==="user"?"#111":"#F5F3EE",color:m.r==="user"?"#FFF":"#111",fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.t}</div>
        ))}
        {loading && <div style={{alignSelf:"flex-start",padding:"10px 14px",borderRadius:"16px 16px 16px 4px",background:"#F5F3EE",color:"#999",fontSize:14}}>Thinking...</div>}
        <div ref={ref}/>
      </div>
      <form onSubmit={send} style={{padding:12,borderTop:"1px solid #EAEAEA",display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Type a message..." style={{flex:1,height:42,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 14px",fontSize:14,outline:"none"}}/>
        <button type="submit" disabled={loading} style={{height:42,padding:"0 16px",borderRadius:12,background:"#C8A96E",border:"none",color:"#FFF",fontWeight:600,cursor:"pointer",fontSize:14}}>Send</button>
      </form>
    </div>
  );
}
