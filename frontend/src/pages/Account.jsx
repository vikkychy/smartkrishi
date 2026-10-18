import { ArrowRight, Leaf, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import BuyerOrders from "../components/BuyerOrders.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Account() {
  const { user } = useAuth();

  return (
    <main className="account-page">
      <div className="eyebrow"><span className="eyebrow-dot" /> YOUR KRISHI ACCOUNT</div>
      <h1>Welcome, <span>{user.name.split(" ")[0]}.</span></h1>
      <p className="account-intro">Your place in a more connected food community.</p>
      <section className="account-card">
        <span className="account-avatar"><Leaf size={28} /></span>
        <div className="account-detail"><span>Name</span><strong>{user.name}</strong></div>
        <div className="account-detail"><span>Account type</span><strong className="role-label"><ShieldCheck size={15} /> {user.role}</strong></div>
        {(user.email || user.phone) && <div className="account-detail"><span>Contact</span><strong>{user.email || user.phone}</strong></div>}
        {user.location && <div className="account-detail"><span>Location</span><strong><MapPin size={15} /> {user.location}</strong></div>}
      </section>
      {user.role === "buyer" && (
        <>
          <div className="buyer-account-actions">
            <Link className="button button-dark" to="/marketplace">Shop fresh produce <ArrowRight size={17} /></Link>
            <Link className="button button-outline account-cart-button" to="/cart">Open shopping cart <ArrowRight size={17} /></Link>
          </div>
          <BuyerOrders />
        </>
      )}
      {user.role !== "buyer" && <Link className="button button-dark" to="/marketplace">Explore the marketplace <ArrowRight size={17} /></Link>}
    </main>
  );
}
