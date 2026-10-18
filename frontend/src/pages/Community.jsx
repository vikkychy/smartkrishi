import {
  BadgeCheck, Check, ImagePlus, MessageCircle, Search, Send, ShieldAlert, Sprout, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api, { getImageUrl } from "../lib/api.js";

const emptyForm = {
  title: "", cropAffected: "", diseaseCategory: "Other", severity: "medium",
  symptoms: "", description: "",
};
const diseaseCategories = ["Other", "Fungal", "Bacterial", "Viral", "Pest", "Nutrient deficiency", "Environmental"];

function isExpert(user) {
  return user && ["expert", "admin"].includes(user.role);
}

function displayDate(date) {
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function PostSkeleton() {
  return <div className="community-skeleton" aria-label="Loading discussion"><span /><span /><span /><span /></div>;
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [imageModal, setImageModal] = useState(null);
  const [filters, setFilters] = useState({ crop: "", category: "", status: "" });
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/posts");
      setPosts(data.posts);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't load the advisory feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);
  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);
  useEffect(() => {
    if (!imageModal) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setImageModal(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [imageModal]);

  const availableCrops = useMemo(() => [...new Set(posts.map((post) => post.cropAffected).filter(Boolean))].sort(), [posts]);
  const visiblePosts = useMemo(() => posts.filter((post) => (
    (!filters.crop || post.cropAffected?.toLowerCase() === filters.crop.toLowerCase())
    && (!filters.category || post.diseaseCategory?.toLowerCase() === filters.category.toLowerCase())
    && (!filters.status || (post.status || "Open") === filters.status)
  )), [posts, filters]);

  const createPost = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const postData = new FormData();
      Object.entries(form).forEach(([key, value]) => postData.append(key, typeof value === "string" ? value.trim() : value));
      if (imageFile) postData.append("image", imageFile);
      const { data } = await api.post("/posts", postData, { headers: { "Content-Type": "multipart/form-data" } });
      setPosts((current) => [data.post, ...current.filter((post) => post._id !== data.post._id)]);
      setForm(emptyForm);
      setImageFile(null);
      setImageInputKey((current) => current + 1);
      setNotice("Your advisory request has been shared with the community.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't publish your advisory request.");
    } finally {
      setSubmitting(false);
    }
  };

  const addSolution = async (event, post) => {
    event.preventDefault();
    const text = replies[post._id]?.trim();
    if (!text) return;
    setError("");
    setNotice("");
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { text });
      setPosts((current) => current.map((item) => item._id === post._id ? data.post : item));
      setReplies((current) => ({ ...current, [post._id]: "" }));
      setNotice("Your solution has been added.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't add your solution.");
    }
  };

  const updateStatus = async (post, status) => {
    setError("");
    try {
      const { data } = await api.patch(`/posts/${post._id}/status`, { status });
      setPosts((current) => current.map((item) => item._id === post._id ? data.post : item));
      setNotice(status === "Resolved" ? "Discussion marked as resolved." : "Discussion reopened.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't update this advisory status.");
    }
  };

  const ownerCanResolve = (post) => user && (
    String(post.authorId?._id || post.authorId) === String(user._id || user.id) || isExpert(user)
  );

  return (
    <main className="workspace-page community-page advisory-dashboard">
      <header className="workspace-heading">
        <div className="eyebrow"><span className="eyebrow-dot" /> FIELD KNOWLEDGE · EXPERT ADVISORY</div>
        <h1>Community <span>advisory.</span></h1>
        <p>Share crop symptoms, get trusted guidance, and help knowledge travel from field to field.</p>
      </header>

      {error && <div className="notice notice-error" role="alert"><ShieldAlert size={16} />{error}</div>}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}

      {user ? (
        <section className="workspace-card community-compose advisory-compose rounded-2xl bg-white/80 shadow-glass backdrop-blur-sm">
          <div className="workspace-card-heading"><span className="workspace-icon"><Sprout size={19} /></span><div><h2>Start an advisory request</h2><p>Describe the crop and symptoms. A clear photo helps experts respond.</p></div></div>
          <form className="workspace-form advisory-form" onSubmit={createPost}>
            <div className="advisory-form-primary">
              <div><label className="field-label" htmlFor="question-title">Question title</label><input className="workspace-input" id="question-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={160} required placeholder="e.g. Yellow spots spreading across tomato leaves" /></div>
              <div><label className="field-label" htmlFor="crop-affected">Crop affected</label><input className="workspace-input" id="crop-affected" value={form.cropAffected} onChange={(event) => setForm({ ...form, cropAffected: event.target.value })} maxLength={120} required placeholder="e.g. Tomato" /></div>
            </div>
            <div className="advisory-form-primary advisory-form-categories">
              <div><label className="field-label" htmlFor="disease-category">Disease category</label><select className="workspace-input" id="disease-category" value={form.diseaseCategory} onChange={(event) => setForm({ ...form, diseaseCategory: event.target.value })}>{diseaseCategories.map((category) => <option key={category}>{category}</option>)}</select></div>
              <div><label className="field-label" htmlFor="severity">Severity</label><select className="workspace-input" id="severity" value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}><option value="low">Low</option><option value="medium">Moderate</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            </div>
            <label className="field-label" htmlFor="symptoms">Symptoms observed</label>
            <textarea className="workspace-input workspace-textarea" id="symptoms" value={form.symptoms} onChange={(event) => setForm({ ...form, symptoms: event.target.value })} maxLength={3000} rows={3} required placeholder="Describe visible changes, when they began, and how quickly they are spreading..." />
            <label className="field-label" htmlFor="question-details">Field details <span className="optional">(optional)</span></label>
            <textarea className="workspace-input workspace-textarea" id="question-details" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={5000} rows={3} placeholder="Share recent weather, watering, treatment, or other useful context..." />
            <label className="field-label" htmlFor="question-image"><ImagePlus size={14} /> Crop photo <span className="optional">(optional · JPEG, PNG, WebP, GIF; max 5 MB)</span></label>
            <input key={imageInputKey} className="workspace-input file-input" id="question-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
            {imagePreview && <button className="selected-image-preview" type="button" onClick={() => setImageModal({ url: imagePreview, title: "Selected crop photo" })}><img className="image-upload-preview" src={imagePreview} alt="Selected crop photo preview" /><span>Preview image</span></button>}
            <button className="button button-dark workspace-submit" type="submit" disabled={submitting}>{submitting ? "Sharing request..." : "Share advisory request"} <Send size={15} /></button>
          </form>
        </section>
      ) : (
        <div className="community-signin"><span>Have a crop health question or a solution to share?</span><Link className="button button-dark button-small" to="/login">Sign in to join the conversation</Link></div>
      )}

      <section className="community-feed" aria-label="Agri-expert advisory feed">
        <div className="community-feed-heading advisory-feed-heading"><div><span className="eyebrow">COMMUNITY KNOWLEDGE</span><h2>Crop health discussions</h2></div><span>{visiblePosts.length} {visiblePosts.length === 1 ? "discussion" : "discussions"}</span></div>
        <div className="advisory-filters" role="search">
          <label className="filter-search"><Search size={16} /><span className="visually-hidden">Filter by crop</span><select className="workspace-input" aria-label="Filter by crop" value={filters.crop} onChange={(event) => setFilters({ ...filters, crop: event.target.value })}><option value="">All crops</option>{availableCrops.map((crop) => <option key={crop}>{crop}</option>)}</select></label>
          <label><span className="visually-hidden">Filter by disease category</span><select className="workspace-input" aria-label="Filter by disease category" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{diseaseCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span className="visually-hidden">Filter by discussion status</span><select className="workspace-input" aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="Open">Open</option><option value="Resolved">Resolved</option></select></label>
        </div>
        {loading ? <div className="community-skeleton-list"><PostSkeleton /><PostSkeleton /></div> : visiblePosts.length ? visiblePosts.map((post) => (
          <article className="community-post advisory-post rounded-2xl bg-white/80 shadow-glass backdrop-blur-sm" key={post._id}>
            <div className="community-post-byline">
              <span className="post-avatar">{post.authorId?.name?.charAt(0)?.toUpperCase() || "F"}</span>
              <div className="post-author-details"><div><strong>{post.authorId?.name || "Community member"}</strong>{isExpert(post.authorId) && <span className="expert-badge"><BadgeCheck size={13} />Verified expert</span>}</div><span>{post.authorId?.role || "farmer"} · {displayDate(post.createdAt)}</span></div>
              <span className={`advisory-status ${post.status === "Resolved" ? "advisory-resolved" : ""}`}>{post.status || "Open"}</span>
            </div>
            <div className="advisory-tags"><span className="crop-tag">{post.cropAffected || "Crop not specified"}</span><span>{post.diseaseCategory || "Other"}</span><span className={`severity-tag severity-${post.severity || "medium"}`}>{post.severity || "medium"} severity</span></div>
            <h3>{post.title}</h3>
            {post.symptoms && <div className="symptoms-panel"><strong>Symptoms observed</strong><p>{post.symptoms}</p></div>}
            {post.description && <p className="community-post-description">{post.description}</p>}
            {post.imageUrl && <button className="community-image-link" type="button" onClick={() => setImageModal({ url: getImageUrl(post.imageUrl), title: post.title })} aria-label={`Preview crop photo for ${post.title}`}><img src={getImageUrl(post.imageUrl)} alt={`Crop symptoms: ${post.title}`} loading="lazy" /><span>View photo</span></button>}
            <div className="community-comments-heading"><MessageCircle size={15} /> {post.comments.length} {post.comments.length === 1 ? "solution" : "solutions"}</div>
            {post.comments.map((comment) => (
              <div className="community-comment advisory-solution" key={comment._id}>
                <span className="comment-avatar">{comment.authorId?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                <p><strong>{comment.authorId?.name || "Community member"}{comment.expertVerified && <span className="expert-badge"><BadgeCheck size={12} />Expert verified</span>}</strong><span>{comment.text}</span><small>{displayDate(comment.createdAt)}</small></p>
              </div>
            ))}
            {user && post.status !== "Resolved" && <form className="community-reply-form" onSubmit={(event) => addSolution(event, post)}>
              <input className="workspace-input" aria-label={`Submit a solution for ${post.title}`} value={replies[post._id] || ""} onChange={(event) => setReplies((current) => ({ ...current, [post._id]: event.target.value }))} maxLength={2000} placeholder={isExpert(user) ? "Share an expert-verified solution..." : "Share a helpful solution..."} required />
              <button className="button button-dark button-small" type="submit" aria-label="Submit solution"><Send size={15} /></button>
            </form>}
            {ownerCanResolve(post) && <button className="resolve-discussion" type="button" onClick={() => updateStatus(post, post.status === "Resolved" ? "Open" : "Resolved")}><Check size={14} />{post.status === "Resolved" ? "Reopen discussion" : "Mark as resolved"}</button>}
          </article>
        )) : error ? null : <div className="workspace-empty"><span className="empty-icon"><MessageCircle size={23} /></span><strong>No matching discussions</strong><span>Try changing your filters or start a new advisory request.</span></div>}
      </section>
      {imageModal && <div className="image-modal-backdrop" role="presentation" onClick={() => setImageModal(null)}><div className="image-modal" role="dialog" aria-modal="true" aria-label={imageModal.title} onClick={(event) => event.stopPropagation()}><div><strong>{imageModal.title}</strong><button className="icon-button" type="button" onClick={() => setImageModal(null)} aria-label="Close image preview"><X size={19} /></button></div><img src={imageModal.url} alt={imageModal.title} /><span>Press Escape or click outside the image to close</span></div></div>}
    </main>
  );
}
