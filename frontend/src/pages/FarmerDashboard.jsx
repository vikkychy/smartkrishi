import { ImagePlus, Leaf, PackagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api, { getImageUrl } from "../lib/api.js";
import { formatNpr } from "../lib/formatCurrency.js";

const emptyForm = {
  name: "",
  category: "Vegetables",
  pricePerKg: "",
  quantityKg: "",
  location: "",
};

export default function FarmerDashboard() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/products/mine");
      setProducts(data.products);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't load your listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const productData = new FormData();
      Object.entries({
        ...form,
        name: form.name.trim(),
        location: form.location.trim(),
      }).forEach(([key, value]) => productData.append(key, value));
      if (imageFile) productData.append("image", imageFile);
      await api.post("/products", productData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(emptyForm);
      setImageFile(null);
      setImageInputKey((current) => current + 1);
      setNotice("Your produce is now listed in the marketplace.");
      await loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't create your listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateProduct = async (product, updates) => {
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(`/products/${product._id}`, updates);
      setProducts((current) => current.map((item) => item._id === data.product._id ? data.product : item));
      setNotice(updates.availableStatus === undefined ? "Listing updated." : `Listing ${updates.availableStatus ? "activated" : "paused"}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't update this listing.");
    }
  };

  const removeProduct = async (product) => {
    setError("");
    setNotice("");
    try {
      await api.delete(`/products/${product._id}`);
      setProducts((current) => current.filter((item) => item._id !== product._id));
      setNotice("Listing removed.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't remove this listing.");
    }
  };

  const updateProductImage = async (product, file) => {
    setError("");
    setNotice("");
    try {
      const productData = new FormData();
      productData.append("image", file);
      const { data } = await api.put(`/products/${product._id}`, productData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProducts((current) => current.map((item) => item._id === data.product._id ? data.product : item));
      setNotice("Listing photo updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't update the listing photo.");
    }
  };

  return (
    <main className="workspace-page">
      <header className="workspace-heading">
        <div className="eyebrow"><span className="eyebrow-dot" /> FARMER WORKSPACE</div>
        <h1>Your farm, <span>growing.</span></h1>
        <p>Add fresh produce to the marketplace and keep your active listings up to date.</p>
      </header>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}

      <div className="workspace-grid">
        <section className="workspace-card">
          <div className="workspace-card-heading"><span className="workspace-icon"><PackagePlus size={19} /></span><div><h2>Add produce</h2><p>Share what's fresh from your farm.</p></div></div>
          <form className="workspace-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="product-name">Produce name</label>
            <input className="workspace-input" id="product-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required placeholder="e.g. Fresh tomatoes" />

            <label className="field-label" htmlFor="product-category">Category</label>
            <select className="workspace-input" id="product-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required>
              <option>Vegetables</option><option>Fruits</option><option>Grains</option><option>Herbs</option>
            </select>

            <div className="workspace-fields-row">
              <div><label className="field-label" htmlFor="product-price">Price (NPR/kg)</label><input className="workspace-input" id="product-price" type="number" min="0" step="0.01" value={form.pricePerKg} onChange={(event) => setForm({ ...form, pricePerKg: event.target.value })} required /></div>
              <div><label className="field-label" htmlFor="product-quantity">Quantity (kg)</label><input className="workspace-input" id="product-quantity" type="number" min="0" step="0.1" value={form.quantityKg} onChange={(event) => setForm({ ...form, quantityKg: event.target.value })} required /></div>
            </div>

            <label className="field-label" htmlFor="product-location">Farm location</label>
            <input className="workspace-input" id="product-location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={200} required placeholder="Town or district" />

            <label className="field-label" htmlFor="product-image"><ImagePlus size={14} /> Product photo <span className="optional">(optional · JPEG, PNG, WebP, GIF; max 5 MB)</span></label>
            <input key={imageInputKey} className="workspace-input file-input" id="product-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
            {imagePreview && <img className="image-upload-preview" src={imagePreview} alt="Selected produce preview" />}
            <button className="button button-dark workspace-submit" type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add to marketplace"} <PackagePlus size={16} /></button>
          </form>
        </section>

        <section className="workspace-card">
          <div className="workspace-card-heading"><span className="workspace-icon"><Leaf size={19} /></span><div><h2>Your listings</h2><p>Pause, reactivate, or remove your produce.</p></div></div>
          {loading ? <div className="workspace-empty"><span className="loader" />Loading your listings...</div> : products.length ? (
            <div className="listing-list">
              {products.map((product) => {
                const isActive = product.availableStatus;
                return (
                  <article className="listing-item" key={product._id}>
                    {product.image ? <img className="listing-thumb" src={getImageUrl(product.image)} alt="" /> : <span className="listing-thumb listing-thumb-empty"><Leaf size={19} /></span>}
                    <div className="listing-info"><strong>{product.name}</strong><span>{product.quantityKg} kg · {formatNpr(product.pricePerKg)}/kg</span><small>{product.location}</small></div>
                    <span className={`listing-status${isActive ? " is-active" : ""}`}>{isActive ? "Active" : "Paused"}</span>
                    <form className="listing-stock" onSubmit={(event) => {
                      event.preventDefault();
                      const quantityKg = Number(new FormData(event.currentTarget).get("quantityKg"));
                      updateProduct(product, { quantityKg });
                    }}>
                      <label htmlFor={`stock-${product._id}`}>Stock (kg)</label>
                      <input className="workspace-input" id={`stock-${product._id}`} name="quantityKg" type="number" min="0" step="0.1" defaultValue={product.quantityKg} required />
                      <button className="button button-small button-outline" type="submit">Update stock</button>
                    </form>
                    <div className="listing-actions">
                      <label className="button button-small button-outline listing-photo-button" htmlFor={`listing-image-${product._id}`}><ImagePlus size={13} /> Photo</label>
                      <input className="visually-hidden" id={`listing-image-${product._id}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) updateProductImage(product, file);
                        event.target.value = "";
                      }} />
                      <button className="button button-small button-outline" type="button" onClick={() => updateProduct(product, { availableStatus: !isActive })}>{isActive ? "Pause" : "Activate"}</button>
                      <button className="icon-button listing-delete" type="button" onClick={() => removeProduct(product)} aria-label={`Remove ${product.name}`} title="Remove listing"><Trash2 size={17} /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <div className="workspace-empty"><span className="empty-icon"><PackagePlus size={23} /></span><strong>No listings yet</strong><span>Add your first produce listing to get started.</span></div>}
        </section>
      </div>
    </main>
  );
}
