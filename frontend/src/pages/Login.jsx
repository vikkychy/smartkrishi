import { ArrowRight, Leaf, LockKeyhole, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", identifier: "", password: "", role: "buyer", location: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/account";

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (isRegistering) {
        const isEmail = form.identifier.includes("@");
        await register({
          name: form.name.trim(),
          ...(isEmail ? { email: form.identifier.trim() } : { phone: form.identifier.trim() }),
          password: form.password,
          role: form.role,
          location: form.location.trim(),
        });
      } else {
        await login({ identifier: form.identifier.trim(), password: form.password });
      }
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't complete your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <div className="auth-aside-art"><span className="auth-sun" /><span className="auth-leaf auth-leaf-a">❧</span><span className="auth-leaf auth-leaf-b">❧</span></div>
        <Link className="brand auth-brand" to="/"><span className="brand-mark"><Leaf size={21} /></span><span>smart<span className="brand-accent">krishi</span></span></Link>
        <div className="auth-aside-copy">
          <div className="eyebrow">GROW TOGETHER</div>
          <h1>Closer to the<br /><span>good stuff.</span></h1>
          <p>Join a community making fresh food more connected, fair, and local.</p>
        </div>
        <span className="auth-aside-foot">GOOD FOOD. GOOD ROOTS.</span>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="eyebrow">{isRegistering ? "JOIN THE COMMUNITY" : "WELCOME BACK"}</div>
          <h2>{isRegistering ? "Create your account" : "Good to see you."}</h2>
          <p className="form-subtitle">{isRegistering ? "A few details and you're ready to grow." : "Sign in to continue to Smart Krishi."}</p>

          {error && <div className="notice notice-error" role="alert">{error}</div>}
          {isRegistering && (
            <>
              <label className="field-label" htmlFor="name">Your name</label>
              <div className="input-wrap"><UserRound size={17} /><input id="name" name="name" value={form.name} onChange={updateField} autoComplete="name" placeholder="e.g. Asha Sharma" required /></div>
            </>
          )}
          <label className="field-label" htmlFor="identifier">Email or phone</label>
          <div className="input-wrap">{form.identifier.includes("@") ? <Mail size={17} /> : <Phone size={17} />}<input id="identifier" name="identifier" value={form.identifier} onChange={updateField} autoComplete="username" placeholder="you@example.com or phone number" required /></div>

          {isRegistering && (
            <>
              <label className="field-label" htmlFor="role">I am a</label>
              <select className="select-input" id="role" name="role" value={form.role} onChange={updateField}>
                <option value="buyer">Buyer</option>
                <option value="farmer">Farmer</option>
              </select>
              <label className="field-label" htmlFor="location">Your location <span className="optional">(optional)</span></label>
              <div className="input-wrap"><MapPin size={17} /><input id="location" name="location" value={form.location} onChange={updateField} autoComplete="address-level2" placeholder="Town or district" /></div>
            </>
          )}

          <label className="field-label" htmlFor="password">Password</label>
          <div className="input-wrap"><LockKeyhole size={17} /><input id="password" name="password" type="password" value={form.password} onChange={updateField} autoComplete={isRegistering ? "new-password" : "current-password"} minLength={isRegistering ? 8 : undefined} placeholder={isRegistering ? "At least 8 characters" : "Enter your password"} required /></div>

          <button className="button button-dark auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : isRegistering ? "Create account" : "Sign in"} <ArrowRight size={17} />
          </button>
          {!isRegistering && <p className="auth-forgot"><Link to="/reset-password">Forgot password?</Link></p>}
          <p className="auth-switch">
            {isRegistering ? "Already have an account?" : "New to Smart Krishi?"}{" "}
            <button type="button" onClick={() => { setIsRegistering((value) => !value); setError(""); }}>
              {isRegistering ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
