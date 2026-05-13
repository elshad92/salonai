import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

const SERVICES = [
  { id: "haircut", name: "Haircut", duration: "45 min" },
  { id: "color", name: "Color & Tone", duration: "120 min" },
  { id: "blowout", name: "Blowout", duration: "60 min" },
  { id: "keratin", name: "Keratin Treatment", duration: "90 min" },
];
const MASTERS = [
  { id: "emma", name: "Emma Wilson", role: "Senior Stylist" },
  { id: "olivia", name: "Olivia Brown", role: "Color Specialist" },
  { id: "mia", name: "Mia Johnson", role: "Treatment Expert" },
];
const TIMES = ["09:30","11:00","13:15","15:00","16:30","18:00"];

function nextWeekday() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState("greeting");
  const [booking, setBooking] = useState({});  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "bot", text: "Hi! I'm your salon assistant. Would you like to book an appointment? 💇" }]);
      setStep("greeting");
    }
  }, [open]);

  function addBot(text) {
    setMessages((p) => [...p, { role: "bot", text }]);
  }

  function handle(e) {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", text: val }]);
    setTimeout(() => processStep(val), 400);
  }
  function processStep(val) {
    const low = val.toLowerCase();
    if (step === "greeting") {
      if (low.includes("yes") || low.includes("book") || low.includes("want") || low.includes("sure") || low.includes("yeah")) {
        const list = SERVICES.map((s,i) => (i+1)+". "+s.name+" ("+s.duration+")").join("\n");
        addBot("Great! Which service would you like?\n\n"+list+"\n\nJust type the number or name.");
        setStep("service");
      } else {
        addBot("No problem! If you change your mind, just say 'book' and I'll help you. 😊");
      }
      return;
    }
    if (step === "service") {
      const found = SERVICES.find((s,i) => low.includes(s.name.toLowerCase()) || low.includes(s.id) || low === String(i+1));
      if (found) {
        setBooking((b) => ({...b, service: found.name}));
        const list = MASTERS.map((m,i) => (i+1)+". "+m.name+" — "+m.role).join("\n");
        addBot("Excellent choice! Who would you like as your stylist?\n\n"+list+"\n\nType a number or name, or say 'any' for the first available.");
        setStep("master");
      } else {
        addBot("I didn't catch that. Please type a number (1-4) or the service name.");
      }
      return;
    }
    if (step === "master") {
      let found = MASTERS.find((m,i) => low.includes(m.name.split(" ")[0].toLowerCase()) || low === String(i+1));
      if (low.includes("any") || low.includes("first") || low.includes("doesnt matter") || low.includes("don")) found = MASTERS[0];
      if (found) {
        setBooking((b) => ({...b, master: found.name}));
        addBot("When would you like to come? Please tell me a date (e.g. tomorrow, May 20, next Monday).");
        setStep("date");
      } else {
        addBot("Please type 1, 2, or 3, or the stylist's name.");
      }
      return;
    }    if (step === "date") {
      let date = null;
      if (low.includes("tomorrow")) {
        const d = new Date(); d.setDate(d.getDate()+1); date = d.toISOString().slice(0,10);
      } else if (low.includes("today")) {
        date = new Date().toISOString().slice(0,10);
      } else {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime()) && parsed > new Date()) date = parsed.toISOString().slice(0,10);
      }
      if (!date) { date = nextWeekday(); }
      setBooking((b) => ({...b, date}));
      const list = TIMES.map((t,i) => (i+1)+". "+t).join("  ");
      addBot("Got it — "+date+". What time works for you?\n\n"+list);
      setStep("time");
      return;
    }
    if (step === "time") {
      let time = TIMES.find((t,i) => low.includes(t) || low === String(i+1));
      if (!time) {
        const num = parseInt(low);
        if (num >= 1 && num <= TIMES.length) time = TIMES[num-1];
      }
      if (time) {
        setBooking((b) => ({...b, time}));
        addBot("Almost done! What's your name?");
        setStep("name");
      } else {
        addBot("Please pick a time slot (1-"+TIMES.length+") or type the time like 11:00.");
      }
      return;
    }    if (step === "name") {
      if (val.length < 2) { addBot("Please enter your full name."); return; }
      setBooking((b) => ({...b, name: val}));
      addBot("Thanks, "+val+"! Last thing — your phone number?");
      setStep("phone");
      return;
    }
    if (step === "phone") {
      const digits = val.replace(/\D/g,"");
      if (digits.length < 7) { addBot("Please enter a valid phone number."); return; }
      const final = {...booking, phone: val};
      setBooking(final);
      setStep("confirming");
      addBot("Perfect! Let me confirm:\n\n"+
        "📋 "+final.service+"\n"+
        "💇 "+final.master+"\n"+
        "📅 "+final.date+"\n"+
        "🕐 "+final.time+"\n"+
        "👤 "+final.name+"\n"+
        "📱 "+val+"\n\n"+
        "Shall I book this? (yes/no)");
      setStep("confirm");
      return;
    }
    if (step === "confirm") {
      if (low.includes("yes") || low.includes("yeah") || low.includes("sure") || low.includes("ok") || low.includes("confirm")) {
        supabase.from("appointments").insert({
          name: booking.name,
          phone: booking.phone || val,
          service: booking.service,
          master: booking.master,
          date: booking.date,
          time: booking.time,
        }).then(({error}) => {
          if (error) { addBot("Oops, something went wrong. Please try again."); setStep("greeting"); }
          else { addBot("✅ Booked! Your appointment is confirmed. See you soon! 🎉"); setStep("done"); }
        });
      } else {
        addBot("No problem — let's start over. Would you like to book an appointment?");
        setBooking({});
        setStep("greeting");
      }
      return;
    }
    if (step === "done") {
      addBot("Your booking is confirmed! If you need anything else, just say 'book' to make another appointment.");
      return;
    }
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position:"fixed",bottom:24,right:24,zIndex:9999,
        width:60,height:60,borderRadius:"50%",
        background:"#C8A96E",border:"none",cursor:"pointer",
        boxShadow:"0 4px 20px rgba(200,169,110,0.4)",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:26,color:"#FFF",
      }}>💬</button>
    );
  }
  return (
    <div style={{
      position:"fixed",bottom:24,right:24,zIndex:9999,
      width:380,height:520,borderRadius:20,overflow:"hidden",
      border:"1px solid #E8E8E8",
      boxShadow:"0 12px 48px rgba(0,0,0,0.12)",
      display:"flex",flexDirection:"column",background:"#FFF",
      fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    }}>
      <div style={{padding:"14px 18px",background:"#111",color:"#FFF",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontWeight:600,fontSize:15}}>🤖 AI Receptionist</div>
          <div style={{fontSize:11,color:"#AAA",marginTop:2}}>Online — ready to help</div>
        </div>
        <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#888",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {messages.map((msg,i)=>(
          <div key={i} style={{
            alignSelf:msg.role==="user"?"flex-end":"flex-start",
            maxWidth:"80%",padding:"10px 14px",
            borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
            background:msg.role==="user"?"#111":"#F5F3EE",
            color:msg.role==="user"?"#FFF":"#111",
            fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap",
          }}>{msg.text}</div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <form onSubmit={handle} style={{padding:12,borderTop:"1px solid #EAEAEA",display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Type a message..."
          style={{flex:1,height:42,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 14px",fontSize:14,outline:"none"}}/>
        <button type="submit" style={{height:42,padding:"0 16px",borderRadius:12,background:"#C8A96E",border:"none",color:"#FFF",fontWeight:600,cursor:"pointer",fontSize:14}}>Send</button>
      </form>
    </div>
  );
}