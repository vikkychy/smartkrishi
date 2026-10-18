import { ArrowDown, ArrowRight, ArrowUpRight, Leaf, MapPin, ShieldCheck, ShoppingBasket, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getImageUrl } from "../lib/api.js";
import { formatNpr } from "../lib/formatCurrency.js";

const highlights = [
  { number: "01", title: "Grown with care", copy: "Meet the farmers behind every harvest." },
  { number: "02", title: "Fair by design", copy: "A clearer path from field to family table." },
  { number: "03", title: "Fresh, nearby", copy: "Find seasonal produce from your community." },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [marketError, setMarketError] = useState("");
  const [marketLoading, setMarketLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get("/products")
      .then(({ data }) => {
        if (active) setFeatured(data.products.slice(0, 3));
      })
      .catch((error) => {
        if (active) {
          setMarketError(error.response?.data?.message || "Today's market highlights are temporarily unavailable.");
        }
      })
      .finally(() => {
        if (active) setMarketLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> GROW LOCAL. EAT WELL.</div>
          <h1>Good food starts<br />with <span>good roots.</span></h1>
          <p className="hero-intro">
            A better connection between the people who grow our food and the people who love it.
            Discover fresh harvests, straight from local farms.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" to="/marketplace">Explore the harvest <ArrowRight size={17} /></Link>
            <a className="text-link" href="#why-krishi">Our approach <ArrowDown size={15} /></a>
          </div>
          <div className="hero-proof">
            <span className="proof-icon"><Sprout size={19} /></span>
            <span><strong>Rooted in community</strong><small>Better for growers. Fresher for everyone.</small></span>
          </div>
        </div>
        <div className="hero-art" role="img" aria-label="Fresh vegetables and leafy greens from a local harvest">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="art-leaf leaf-one">❧</div>
          <div className="art-leaf leaf-two">❧</div>
          <div className="art-leaf leaf-three">❧</div>
          <div className="art-label"><span className="label-icon"><Leaf size={16} /></span><span>FRESH FROM<br /><strong>THE SOURCE</strong></span></div>
          <div className="art-caption"><MapPin size={14} /> YOUR LOCAL HARVEST</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Marketplace values">
        <span><Leaf size={17} /> Seasonal produce</span>
        <span><MapPin size={17} /> Local connections</span>
        <span><ShieldCheck size={17} /> Farmer-first marketplace</span>
      </section>

      <section className="daily-section">
        <div className="section-heading">
          <div><div className="eyebrow"><span className="eyebrow-dot" /> FRESH PICKS</div><h2>Today in the <span>harvest.</span></h2></div>
          <Link className="text-link" to="/marketplace">See all produce <ArrowRight size={15} /></Link>
        </div>
        {marketError ? (
          <div className="notice notice-error" role="alert">{marketError}</div>
        ) : marketLoading ? (
          <div className="daily-empty"><span className="loader" /> Finding today's fresh picks...</div>
        ) : featured.length ? (
          <div className="daily-grid">
            {featured.map((product) => (
              <Link className="daily-card" to="/marketplace" key={product._id}>
                <div className="daily-image">
                  {product.image ? <img src={getImageUrl(product.image)} alt={product.name} loading="lazy" /> : <ShoppingBasket size={32} strokeWidth={1.3} />}
                </div>
                <div className="daily-info">
                  <span>{product.category}</span>
                  <strong>{product.name}</strong>
                  <small>{formatNpr(product.pricePerKg)}/kg · {product.location}</small>
                </div>
                <ArrowUpRight size={17} className="daily-arrow" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="daily-empty">Fresh picks from local farms will appear here as they are listed.</p>
        )}
      </section>

      <section className="why-section" id="why-krishi">
        <div className="section-heading">
          <div><div className="eyebrow">A HEALTHIER FOOD SYSTEM</div><h2>From our fields,<br /><span>to your table.</span></h2></div>
          <p>Smart Krishi brings the marketplace closer to the people and places that make it possible.</p>
        </div>
        <div className="highlight-grid">
          {highlights.map((item) => (
            <article className="highlight-card" key={item.number}>
              <span className="card-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
