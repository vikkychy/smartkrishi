import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { formatNpr } from "../lib/formatCurrency.js";
import { getImageUrl } from "../lib/api.js";
import api from "../lib/api.js";

export default function Cart() {
  const { user } = useAuth();
  const { items, setQuantity, removeItem, clearCart } = useCart();
  const [delivery, setDelivery] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const total = items.reduce((sum, item) => sum + item.pricePerKg * item.quantityKg, 0);

  const updateDelivery = (event) => {
    setDelivery((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/orders", {
        items: items.map(({ productId, quantityKg }) => ({ productId, quantityKg })),
        delivery,
      });
      clearCart();
      setSuccess(`Demo order ${data.order._id.slice(-8).toUpperCase()} placed. No payment was collected.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="workspace-page buyer-page">
      <header className="workspace-heading">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR BASKET</div>
        <h1>Review your <span>harvest.</span></h1>
        <p>Check your produce and delivery details before placing your demo order.</p>
      </header>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {success && <div className="notice notice-success buyer-notice" role="status">{success} <Link to="/account">View order history</Link></div>}

      {!items.length ? (
        <section className="workspace-card buyer-empty">
          <span className="empty-icon"><ShoppingBag size={25} /></span>
          <h2>Your basket is ready for something fresh</h2>
          <p>Add locally grown produce from the marketplace to begin.</p>
          <Link className="button button-dark" to="/marketplace">Browse produce <ArrowRight size={16} /></Link>
        </section>
      ) : (
        <div className="buyer-cart-layout">
          <section className="workspace-card">
            <div className="buyer-section-heading"><h2>Basket items</h2><span>{items.length} {items.length === 1 ? "item" : "items"}</span></div>
            <div className="buyer-cart-items">
              {items.map((item) => (
                <article className="buyer-cart-item" key={item.productId}>
                  {item.image ? <img className="buyer-cart-image" src={getImageUrl(item.image)} alt="" /> : <span className="buyer-cart-image buyer-cart-placeholder"><ShoppingBag size={21} /></span>}
                  <div className="buyer-cart-info"><strong>{item.name}</strong><span>By {item.farmerName} · {item.location}</span><small>{formatNpr(item.pricePerKg)} / kg</small></div>
                  <div className="buyer-quantity-control">
                    <button className="quantity-button" type="button" onClick={() => {
                      if (item.quantityKg <= 0.1) removeItem(item.productId);
                      else setQuantity(item.productId, Math.round((item.quantityKg - 0.1) * 10) / 10);
                    }} aria-label={`Decrease ${item.name} quantity`}><Minus size={14} /></button>
                    <input className="workspace-input" type="number" aria-label={`${item.name} quantity in kilograms`} min="0.1" max={item.availableQty} step="0.1" value={item.quantityKg} onChange={(event) => {
                      const value = Number(event.target.value);
                      if (value >= 0.1 && value <= item.availableQty) setQuantity(item.productId, value);
                    }} />
                    <button className="quantity-button" type="button" onClick={() => {
                      const next = Math.round((item.quantityKg + 0.1) * 10) / 10;
                      if (next <= item.availableQty) setQuantity(item.productId, next);
                    }} aria-label={`Increase ${item.name} quantity`} disabled={item.quantityKg + 0.1 > item.availableQty}><Plus size={14} /></button>
                  </div>
                  <strong className="buyer-line-total">{formatNpr(item.pricePerKg * item.quantityKg)}</strong>
                  <button className="icon-button listing-delete buyer-remove" type="button" onClick={() => removeItem(item.productId)} aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button>
                </article>
              ))}
            </div>
            <Link className="text-link buyer-continue" to="/marketplace">Continue shopping <ArrowRight size={15} /></Link>
          </section>

          <form className="workspace-card buyer-checkout" onSubmit={placeOrder}>
            <div className="buyer-section-heading"><h2>Delivery details</h2></div>
            <div className="demo-payment-note"><strong>Demo checkout</strong><span>This creates an order request only. No real payment is processed or collected.</span></div>
            <label className="field-label" htmlFor="delivery-name">Recipient name</label>
            <input className="workspace-input" id="delivery-name" name="name" value={delivery.name} onChange={updateDelivery} maxLength={100} required />
            <label className="field-label" htmlFor="delivery-phone">Phone number</label>
            <input className="workspace-input" id="delivery-phone" name="phone" type="tel" value={delivery.phone} onChange={updateDelivery} maxLength={30} required />
            <label className="field-label" htmlFor="delivery-address">Delivery address</label>
            <textarea className="workspace-input workspace-textarea" id="delivery-address" name="address" value={delivery.address} onChange={updateDelivery} rows={3} maxLength={500} required placeholder="Street, town or village, district" />
            <div className="buyer-total-row"><span>Subtotal</span><strong>{formatNpr(total)}</strong></div>
            <div className="buyer-total-row buyer-total-final"><span>Total · NPR</span><strong>{formatNpr(total)}</strong></div>
            <button className="button button-dark workspace-submit" type="submit" disabled={submitting}>{submitting ? "Placing order..." : "Place demo order"} <ArrowRight size={16} /></button>
          </form>
        </div>
      )}
    </main>
  );
}
