import { ArrowUpRight, MapPin, Search, ShoppingBasket, SlidersHorizontal, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import api, { getImageUrl } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { formatNpr } from "../lib/formatCurrency.js";

const categories = ["All produce", "Vegetables", "Fruits", "Grains", "Herbs"];

export default function Marketplace() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All produce");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const loadProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (category !== "All produce") params.category = category;
        const { data } = await api.get("/products", { params, signal: controller.signal });
        setProducts(data.products);
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setError(requestError.response?.data?.message || "We couldn't load the marketplace. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const timeout = window.setTimeout(loadProducts, search ? 250 : 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, category]);

  const handleAddToCart = (product) => {
    const quantityKg = Number(quantities[product._id] ?? Math.min(1, product.quantityKg));
    if (!Number.isFinite(quantityKg) || quantityKg < 0.1 || quantityKg > product.quantityKg) {
      setCartNotice(`Choose a quantity between 0.1 and ${product.quantityKg} kg for ${product.name}.`);
      return;
    }
    const errorMessage = addItem(product, quantityKg);
    setCartNotice(errorMessage || `${quantityKg} kg of ${product.name} added to your cart.`);
  };

  return (
    <main className="market-page">
      <section className="market-heading">
        <div className="eyebrow"><span className="eyebrow-dot" /> THE LOCAL HARVEST</div>
        <h1>Fresh from the <span>farm.</span></h1>
        <p>Find produce grown with care and offered by farmers in your community.</p>
      </section>

      <section className="market-toolbar" aria-label="Search and filter produce">
        <label className="search-box">
          <Search size={19} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vegetables, fruits, location..."
            aria-label="Search products"
          />
        </label>
        <span className="filter-label"><SlidersHorizontal size={17} /> FILTER</span>
        <div className="category-list" role="group" aria-label="Filter by category">
          {categories.map((item) => (
            <button
              className={`category-chip${category === item ? " active" : ""}`}
              type="button"
              key={item}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {cartNotice && <div className="notice notice-success cart-notice" role="status">{cartNotice}</div>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {loading ? (
        <div className="empty-state"><span className="loader" />Finding the freshest picks...</div>
      ) : products.length ? (
        <section className="product-grid" aria-label="Available products">
          {products.map((product) => (
            <article className="product-card" key={product._id}>
              <div className="product-image">
                {product.image ? (
                  <img src={getImageUrl(product.image)} alt={product.name} loading="lazy" />
                ) : (
                  <div className="product-placeholder"><ShoppingBasket size={42} strokeWidth={1.2} /><span>FRESH PICK</span></div>
                )}
                <span className="product-category">{product.category}</span>
              </div>
              <div className="product-details">
                <div className="product-name-row"><h2>{product.name}</h2><span className="product-price">{formatNpr(product.pricePerKg)}<small>/kg</small></span></div>
                <p className="product-location"><MapPin size={14} /> {product.location}</p>
                <div className="product-footer">
                  <span>{product.quantityKg} kg available</span>
                  <span className="farmer-name">By {product.farmer?.name || "Local farmer"}</span>
                </div>
                {user?.role === "buyer" && (
                  <div className="product-buy-row">
                    <label className="visually-hidden" htmlFor={`buy-quantity-${product._id}`}>Quantity of {product.name} in kilograms</label>
                    <input
                      className="workspace-input"
                      id={`buy-quantity-${product._id}`}
                      type="number"
                      min="0.1"
                      max={product.quantityKg}
                      step="0.1"
                      value={quantities[product._id] ?? Math.min(1, product.quantityKg)}
                      onChange={(event) => setQuantities((current) => ({ ...current, [product._id]: event.target.value }))}
                    />
                    <button className="button button-dark button-small" type="button" onClick={() => handleAddToCart(product)}><ShoppingCart size={15} /> Add to cart</button>
                  </div>
                )}
                {!user && <Link className="button button-dark button-small product-buy-signin" to="/login">Sign in to buy <ShoppingCart size={15} /></Link>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><ShoppingBasket size={26} /></span>
          <h2>No harvest found just yet</h2>
          <p>Try another search or check back soon for fresh local listings.</p>
          <button className="text-link" type="button" onClick={() => { setSearch(""); setCategory("All produce"); }}>
            Clear filters <ArrowUpRight size={15} />
          </button>
        </div>
      )}
      <div className="market-note"><span className="eyebrow-dot" /> A growing marketplace — new harvests added by local farmers.</div>
    </main>
  );
}
