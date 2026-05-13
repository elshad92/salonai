import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SalonSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salon, setSalon] = useState(null);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", phone: "", address: "", google_maps_url: "",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("salons").select("*").eq("owner_id", user.id).single();
      if (data) {
        setSalon(data);
        setForm({ name: data.name, slug: data.slug, description: data.description || "", phone: data.phone || "", address: data.address || "", google_maps_url: data.google_maps_url || "" });
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
    const { data: { user } } = await supabase.auth.getUser();
    const slug = form.slug || slugify(form.name);
    const payload = { ...form, slug, owner_id: user.id };

    let error;
    if (salon) {
      ({ error } = await supabase.from("salons").update(payload).eq("id", salon.id));
    } else {
      ({ error } = await supabase.from("salons").insert(payload));
    }
    if (!error) {
      alert("Salon saved! Your booking link: " + window.location.origin + "/s/" + slug);
      navigate("/dashboard");
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  }

  const inp = { width:"100%",height:44,borderRadius:12,border:"1px solid #E0E0E0",padding:"0 12px",fontSize:14,marginTop:6 };
  const lbl = { display:"block",marginBottom:16 };
  const spn = { fontSize:13,color:"#555",fontWeight:500 };
  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>Loading...</div>;

  return (
    <div style={{minHeight:"100vh",background:"#FFF",fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',padding:32}}>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <h1 style={{margin:0,fontSize:28,fontWeight:600}}>Salon Settings</h1>
          <Link to="/dashboard" style={{textDecoration:"none",padding:"10px 14px",borderRadius:999,border:"1px solid #EAEAEA",color:"#111",fontSize:14}}>Back</Link>
        </header>
        <form onSubmit={handleSave} style={{border:"1px solid #EAEAEA",borderRadius:20,padding:28}}>
          <label style={lbl}><span style={spn}>Salon Name *</span>
            <input value={form.name} onChange={e=>{setForm({...form,name:e.target.value,slug:slugify(e.target.value)})}} required style={inp}/></label>
          <label style={lbl}><span style={spn}>URL Slug</span>
            <input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} style={inp} placeholder="glamour-studio"/>
            <span style={{fontSize:12,color:"#999",marginTop:4,display:"block"}}>Your link: {window.location.origin}/s/{form.slug || "your-salon"}</span></label>
          <label style={lbl}><span style={spn}>Description</span>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={inp} placeholder="Premium hair salon in downtown NYC"/></label>
          <label style={lbl}><span style={spn}>Phone</span>
            <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={inp} placeholder="+1 555 123-4567"/></label>
          <label style={lbl}><span style={spn}>Address</span>
            <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} style={inp} placeholder="123 Main St, New York"/></label>
          <label style={lbl}><span style={spn}>Google Maps Review Link</span>
            <input value={form.google_maps_url} onChange={e=>setForm({...form,google_maps_url:e.target.value})} style={inp} placeholder="https://g.page/r/..."/></label>
          <button type="submit" disabled={saving} style={{width:"100%",height:50,borderRadius:14,background:"#C8A96E",border:"none",color:"#FFF",fontSize:16,fontWeight:600,cursor:"pointer",marginTop:8}}>{saving ? "Saving..." : salon ? "Update Salon" : "Create Salon"}</button>
        </form>
      </div>
    </div>
  );
}