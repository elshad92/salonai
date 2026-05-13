import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import Marketing from "./pages/Marketing";
import SalonPage from "./pages/SalonPage";
import SalonSetup from "./pages/SalonSetup";
import ChatWidget from "./lib/ChatWidget";

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
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
        <Route path="/salon-setup" element={<ProtectedRoute><SalonSetup /></ProtectedRoute>} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/s/:slug" element={<SalonPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatWidget />
    </BrowserRouter>
  );
}

export default App;