import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

const SYSTEM_PROMPT = `You are SalonAI Assistant — a friendly, professional receptionist for a beauty salon.
Your job is to help clients book appointments.

Available services:
- Haircut (45 min)
- Color & Tone (120 min)
- Blowout (60 min)
- Keratin Treatment (90 min)

Available masters:
- Emma Wilson (Senior Stylist)
- Olivia Brown (Color Specialist)
- Mia Johnson (Treatment Expert)

Available times: 09:30, 11:00, 13:15, 15:00, 16:30, 18:00

When a client wants to book:
1. Ask what service they want
2. Suggest a master (or let them choose)
3. Ask for preferred date and time
4. Ask for their name and phone number
5. Confirm the booking

When you have ALL info (service, master, date, time, name, phone), respond with a JSON block like this at the end of your message:
###BOOKING###
{"service":"haircut","master":"emma","date":"2026-05-15","time":"11:00","name":"John","phone":"+1234567890"}
###END###

Be conversational, warm, and brief. Use 1-2 sentences max per response.`;

function parseBooking(text) {
  const match = text.match(/###BOOKING###\s*(\{[\s\S]*?\})\s*###END###/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function cleanResponse(text) {
  return text.replace(/###BOOKING###[\s\S]*?###END###/, "").trim();
}
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your salon assistant. Would you like to book an appointment? 💇‍♀️" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    const history = [...messages, { role: "user", text: userMsg }];
    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      })),
    ];

    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma-3-27b-it",
          messages: apiMessages,
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      let reply = "Sorry, I'm having trouble right now. Please try again.";
      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || reply;
        const booking = parseBooking(raw);
        reply = cleanResponse(raw) || "Your appointment is confirmed! ✅";

        if (booking && !booked) {
          await supabase.from("appointments").insert({
            name: booking.name,
            phone: booking.phone,
            service: booking.service,
            master: booking.master,
            date: booking.date,
            time: booking.time,
            created_at: new Date().toISOString(),
          });
          setBooked(true);
          reply += "\n\n✅ Booking saved! You'll see it in your salon's dashboard.";
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Connection error. Please try again." },
      ]);
    }
    setLoading(false);
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 60, height: 60, borderRadius: "50%",
          background: "#C8A96E", border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(200,169,110,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, color: "#FFF",
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      width: 380, height: 520,
      borderRadius: 20, overflow: "hidden",
      border: "1px solid #E8E8E8",
      boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
      display: "flex", flexDirection: "column",
      background: "#FFF",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        padding: "14px 18px",
        background: "#111", color: "#FFF",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>🤖 AI Receptionist</div>
          <div style={{ fontSize: 11, color: "#AAA", marginTop: 2 }}>Online — ready to help</div>
        </div>
        <button onClick={() => setOpen(false)} style={{
          background: "none", border: "none", color: "#888",
          fontSize: 20, cursor: "pointer",
        }}>✕</button>
      </div>
      <div style={{
        flex: 1, overflowY: "auto", padding: 14,
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "80%",
            padding: "10px 14px",
            borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            background: msg.role === "user" ? "#111" : "#F5F3EE",
            color: msg.role === "user" ? "#FFF" : "#111",
            fontSize: 14, lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: "flex-start", padding: "10px 14px",
            borderRadius: "16px 16px 16px 4px",
            background: "#F5F3EE", color: "#999", fontSize: 14,
          }}>
            Typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{
        padding: 12, borderTop: "1px solid #EAEAEA",
        display: "flex", gap: 8,
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1, height: 42, borderRadius: 12,
            border: "1px solid #E0E0E0", padding: "0 14px",
            fontSize: 14, outline: "none",
          }}
        />
        <button type="submit" disabled={loading} style={{
          height: 42, padding: "0 16px", borderRadius: 12,
          background: "#C8A96E", border: "none", color: "#FFF",
          fontWeight: 600, cursor: "pointer", fontSize: 14,
        }}>
          Send
        </button>
      </form>
    </div>
  );
}