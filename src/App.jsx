import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ChatWidget from "./lib/ChatWidget";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Marketing = lazy(() => import("./pages/Marketing"));
const SalonSetup = lazy(() => import("./pages/SalonSetup"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const Booking = lazy(() => import("./pages/Booking"));
const SalonPage = lazy(() => import("./pages/SalonPage"));

const ff = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

function PageLoader() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:ff }}>
      <div style={{ color:"#999", fontSize:14 }}>Loading…</div>
    </div>
  );
}

function NotFound() {
  return (
    <main style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:ff, textAlign:"center", padding:32, background:"#fff", color:"#111" }}>
      <p style={{ margin:"0 0 4px", fontSize:72, fontWeight:700, letterSpacing:"-0.04em", lineHeight:1 }}>404</p>
      <p style={{ margin:"0 0 28px", fontSize:17, color:"#666" }}>Page not found.</p>
      <a href="/" style={{ padding:"12px 28px", borderRadius:999, background:"#111", color:"#fff", textDecoration:"none", fontSize:15, fontWeight:600 }}>Go home →</a>
    </main>
  );
}

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
          <Route path="/salon-setup" element={<ProtectedRoute><SalonSetup /></ProtectedRoute>} />
          <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/s/:slug" element={<SalonPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ChatWidget />
    </BrowserRouter>
  );
}
