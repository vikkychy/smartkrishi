import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Account from "./pages/Account.jsx";
import Cart from "./pages/Cart.jsx";
import Community from "./pages/Community.jsx";
import FarmerDashboard from "./pages/FarmerDashboard.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

const HarvestManager = lazy(() => import("./pages/HarvestManager.jsx"));

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="route-loading"><span className="loader" /> Restoring your session...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (role && user.role !== role) return <Navigate to="/account" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/community" element={<Community />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute role="buyer"><Cart /></ProtectedRoute>} />
        <Route path="/farmer" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />
        <Route path="/harvests" element={<ProtectedRoute role="farmer"><Suspense fallback={<div className="route-loading"><span className="loader" /> Loading your harvest dashboard...</div>}><HarvestManager /></Suspense></ProtectedRoute>} />
        <Route path="*" element={<main className="not-found"><h1>Page not found</h1><p>Let's find our way back to the harvest.</p><a href="/">Return home</a></main>} />
      </Routes>
      <footer className="site-footer">
        <span className="brand"><span className="brand-mark"><span className="footer-leaf">✳</span></span><span>smart<span className="brand-accent">krishi</span></span></span>
        <span>Growing a better connection, one harvest at a time.</span>
        <span>© {new Date().getFullYear()} Smart Krishi</span>
      </footer>
    </>
  );
}
