import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SalonPage() {
  const { slug } = useParams();
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [selectedMaster, setSelectedMaster] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const times = ["09:30","10:00","11:00","12:00","13:15","14:00","15:00","16:30","18:00"];

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error || !data) setNotFound(true);
      else setSalon(data);
      setLoading(false);
    }
    load();
  }, [slug]);
  async function handleBooking(e) {
    e.preventDefault();
    if (!selectedService || !date || !time || !name || !phone) return;
    setSubmitting(true);
    const { error } = await supabase.from("appointments").insert({
      salon_id: salon.id,
      name, phone,
      service: selectedService,
      master: selectedMaster || "Any available",
      date, time,
    });
    if (!error) {
      // Update loyalty
      const { data: existing } = await supabase
        .from("loyalty")
        .select("*")
        .eq("salon_id", salon.id)
        .eq("client_phone", phone)
        .single();
      if (existing) {
        await supabase.from("loyalty").update({
          visits: existing.visits + 1,
          last_visit: date,
          client_name: name,
        }).eq("id", existing.id);
      } else {
        await supabase.from("loyalty").insert({
          salon_id: salon.id,
          client_phone: phone,
          client_name: name,
          visits: 1,
          last_visit: date,
        });
      }
      setSuccess(true);
    }
    setSubmitting(false);
  }

  const services = salon?.services?.length ? salon.services : [
    {name:"Haircut",duration:"45 min"},
    {name:"Color & Tone",duration:"120 min"},
    {name:"Blowout",duration:"60 min"},
    {name:"Keratin Treatment",duration:"90 min"},
  ];
  const masters = salon?.masters?.length ? salon.masters : [
    {name:"Emma Wilson"},{name:"Olivia Brown"},{name:"Mia Johnson"},
  ];
  const accent = salon?.accent_color || "#C8A96E";
  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui"}}>Loading...</div>;
  if (notFound) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui",flexDirection:"column",gap:12}}><h1>Salon not found</h1><p style={{color:"#666"}}>Check the URL and try again.</p></div>;

  if (success) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui",flexDirection:"column",gap:16,padding:32,textAlign:"center"}}>
      <div style={{fontSize:64}}>✅</div>
      <h1 style={{margin:0,fontSize:28}}>Booking Confirmed!</h1>
      <p style={{color:"#666",fontSize:16}}>Your appointment at <strong>{salon.name}</strong> is set.</p>
      <p style={{color:"#666",fontSize:14}}>{selectedService} — {date} at {time}</p>
      <button onClick={()=>{setSuccess(false);setSelectedService("");setDate("");setTime("");setName("");setPhone("")}} style={{marginTop:12,padding:"12px 24px",borderRadius:12,background:accent,border:"none",color:"#FFF",fontWeight:600,cursor:"pointer",fontSize:15}}>Book Another</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#FFF",fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',padding:"32px 16px"}}>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        <header style={{textAlign:"center",marginBottom:32}}>
          <h1 style={{margin:0,fontSize:32,fontWeight:700,letterSpacing:"-0.02em"}}>{salon.name}</h1>
          {salon.description && <p style={{margin:"8px 0 0",color:"#666",fontSize:15}}>{salon.description}</p>}
          {salon.address && <p style={{margin:"6px 0 0",color:"#999",fontSize:13}}>📍 {salon.address}</p>}
          {salon.phone && <p style={{margin:"4px 0 0",color:"#999",fontSize:13}}>📞 {salon.phone}</p>}
        </header>
        <form onSubmit={handleBooking} style={{border:"1px solid #EAEAEA",borderRadius:20,padding:28}}>
          <h2 style={{margin:"0 0 20px",fontSize:22,fontWeight:600}}>Book an Appointment</h2>

          <label style={{display:"block",marginBottom:16}}>
            <span style={{fontSize:13,color:"#555",fontWeight:500}}>Service</span>
            <select value={selectedService} onChange={e=>setSelectedService(e.target.value)} required style={{width:"100%",height:44,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 12px",fontSize:14,marginTop:6,background:"#FFF"}}>
              <option value="">Choose a service...</option>
              {services.map((s,i)=><option key={i} value={s.name}>{s.name} — {s.duration}</option>)}
            </select>
          </label>

          <label style={{display:"block",marginBottom:16}}>
            <span style={{fontSize:13,color:"#555",fontWeight:500}}>Stylist</span>
            <select value={selectedMaster} onChange={e=>setSelectedMaster(e.target.value)} style={{width:"100%",height:44,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 12px",fontSize:14,marginTop:6,background:"#FFF"}}>
              <option value="">Any available</option>
              {masters.map((m,i)=><option key={i} value={m.name}>{m.name}</option>)}
            </select>
          </label>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <label>
              <span style={{fontSize:13,color:"#555",fontWeight:500}}>Date</span>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} required min={new Date().toISOString().slice(0,10)} style={{width:"100%",height:44,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 12px",fontSize:14,marginTop:6}}/>
            </label>
            <label>
              <span style={{fontSize:13,color:"#555",fontWeight:500}}>Time</span>
              <select value={time} onChange={e=>setTime(e.target.value)} required style={{width:"100%",height:44,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 12px",fontSize:14,marginTop:6,background:"#FFF"}}>
                <option value="">Pick time</option>
                {times.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            <label>
              <span style={{fontSize:13,color:"#555",fontWeight:500}}>Your Name</span>
              <input value={name} onChange={e=>setName(e.target.value)} required placeholder="Jane Smith" style={{width:"100%",height:44,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 12px",fontSize:14,marginTop:6}}/>
            </label>
            <label>
              <span style={{fontSize:13,color:"#555",fontWeight:500}}>Phone</span>
              <input value={phone} onChange={e=>setPhone(e.target.value)} required placeholder="+1 555 123-4567" style={{width:"100%",height:44,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 12px",fontSize:14,marginTop:6}}/>
            </label>
          </div>

          <button type="submit" disabled={submitting} style={{width:"100%",height:50,borderRadius:14,background:accent,border:"none",color:"#FFF",fontSize:16,fontWeight:600,cursor:"pointer"}}>{submitting ? "Booking..." : "Confirm Booking"}</button>
        </form>

        <p style={{textAlign:"center",marginTop:20,fontSize:12,color:"#BBB"}}>Powered by SalonAI</p>
      </div>
    </div>
  );
}