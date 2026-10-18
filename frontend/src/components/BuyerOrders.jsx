import { useEffect, useState } from "react";
import api from "../lib/api.js";
import { formatNpr } from "../lib/formatCurrency.js";

function formatOrderDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BuyerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/orders/mine")
      .then(({ data }) => {
        if (active) setOrders(data.orders);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "We couldn't load your order history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="buyer-orders-section">
      <div className="buyer-section-heading"><h2>Your orders</h2><span>{orders.length} {orders.length === 1 ? "order" : "orders"}</span></div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {loading ? <div className="workspace-empty"><span className="loader" />Loading your orders...</div> : orders.length ? (
        <div className="buyer-order-list">
          {orders.map((order) => (
            <article className="buyer-order-card" key={order._id}>
              <div className="buyer-order-top"><div><strong>Order #{order._id.slice(-8).toUpperCase()}</strong><span>{formatOrderDate(order.createdAt)}</span></div><span className={`harvest-status order-status-${order.status}`}>{order.status}</span></div>
              <div className="buyer-order-items">
                {order.items.map((item) => <span key={`${order._id}-${item.productId}`}>{item.name} · {item.quantityKg} kg</span>)}
              </div>
              <div className="buyer-order-bottom"><span className="demo-order-label">Demo · No payment collected</span><strong>{formatNpr(order.totalAmount)}</strong></div>
            </article>
          ))}
        </div>
      ) : <div className="workspace-empty buyer-order-empty"><strong>No orders yet</strong><span>Your completed demo checkout orders will appear here.</span></div>}
    </section>
  );
}
