import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      if (token) {
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }
        const { data } = await api.post("/auth/reset-password", { token, password });
        setNotice(data.message);
        window.setTimeout(() => navigate("/login", { replace: true }), 1800);
      } else if (!otpSent) {
        const { data } = await api.post("/auth/forgot-password", { email });
        setOtpSent(true);
        setNotice(data.message);
      } else {
        if (!/^\d{6}$/.test(otp)) {
          setError("Enter the 6-digit reset code sent to your email.");
          return;
        }
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }
        const { data } = await api.post("/auth/reset-password", { email, otp, password });
        setNotice(data.message);
        window.setTimeout(() => navigate("/login", { replace: true }), 1800);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't complete your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="reset-page">
      <form className="auth-form reset-form" onSubmit={handleSubmit}>
        <div className="reset-icon"><KeyRound size={22} /></div>
        <div className="eyebrow">{token || otpSent ? "SECURE YOUR ACCOUNT" : "ACCOUNT RECOVERY"}</div>
        <h2>{token || otpSent ? "Choose a new password" : "Forgot your password?"}</h2>
        <p className="form-subtitle">{token ? "Choose a strong password with at least 8 characters." : otpSent ? "Enter the 6-digit code from your email, then choose a new password." : "Enter the email address on your account and we'll send a 6-digit reset code."}</p>

        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {notice && <div className="notice notice-success" role="status">{notice}</div>}

        {token ? (
          <>
            <label className="field-label" htmlFor="new-password">New password</label>
            <div className="input-wrap"><KeyRound size={17} /><input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></div>
            <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
            <div className="input-wrap"><KeyRound size={17} /><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></div>
          </>
        ) : otpSent ? (
          <>
            <label className="field-label" htmlFor="reset-otp">6-digit reset code</label>
            <div className="input-wrap"><KeyRound size={17} /><input id="reset-otp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" required placeholder="123456" /></div>
            <label className="field-label" htmlFor="new-password">New password</label>
            <div className="input-wrap"><KeyRound size={17} /><input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></div>
            <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
            <div className="input-wrap"><KeyRound size={17} /><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" required /></div>
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="reset-email">Account email</label>
            <div className="input-wrap"><Mail size={17} /><input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required placeholder="you@example.com" /></div>
          </>
        )}

        <button className="button button-dark auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : token || otpSent ? "Reset password" : "Send reset code"} <ArrowRight size={17} />
        </button>
        <p className="auth-switch"><Link to="/login"><ArrowLeft size={14} /> Back to sign in</Link></p>
      </form>
    </main>
  );
}
