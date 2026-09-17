// app/login/page.tsx
//
// Login page supporting customer (email+password / OTP), agent, and admin
// sign-in. Stores the JWT in localStorage and redirects to the relevant
// dashboard.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signin, signup, sendOTP, verifyOTP, adminSignin, agentSignin } from "../../lib/api/auth";

type Tab = "customer" | "otp" | "agent" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCustomerSignin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signin(email, password);
      localStorage.setItem("token", res.accessToken);
      localStorage.setItem("user", JSON.stringify({ email: res.email, name: res.name, id: res.userId, type: "customer" }));
      router.push("/search");
    } catch (err) {
      setError(err instanceof Error ? err.message : "sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signup(email, password, name);
      localStorage.setItem("token", res.accessToken);
      router.push("/search");
    } catch (err) {
      setError(err instanceof Error ? err.message : "signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      await sendOTP(email);
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP send failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOTP(email, code);
      localStorage.setItem("token", res.accessToken);
      router.push("/search");
    } catch (err) {
      setError(err instanceof Error ? err.message : "verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSignin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await agentSignin(email, password);
      localStorage.setItem("token", res.accessToken);
      router.push("/operator/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "agent sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminSignin(email, password);
      localStorage.setItem("token", res.accessToken);
      router.push("/operator/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "admin sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Sign in to YLT Travels</h1>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
        {(["customer", "otp", "agent", "admin"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium capitalize ${tab === t ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => { setTab(t); setError(null); setOtpSent(false); }}
          >
            {t === "otp" ? "OTP" : t}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        {tab === "customer" && (
          <>
            <Field label="Email">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="Name (for new account)">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={handleCustomerSignin} disabled={loading}>Sign in</button>
              <button className="btn-secondary flex-1" onClick={handleSignup} disabled={loading}>Sign up</button>
            </div>
          </>
        )}

        {tab === "otp" && (
          <>
            <Field label="Email">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {!otpSent ? (
              <button className="btn-primary w-full" onClick={handleSendOTP} disabled={loading}>Send OTP</button>
            ) : (
              <>
                <Field label="6-digit code">
                  <input className="input" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
                </Field>
                <button className="btn-primary w-full" onClick={handleVerifyOTP} disabled={loading}>Verify & sign in</button>
              </>
            )}
          </>
        )}

        {tab === "agent" && (
          <>
            <Field label="Agent email">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <button className="btn-primary w-full" onClick={handleAgentSignin} disabled={loading}>Agent sign in</button>
          </>
        )}

        {tab === "admin" && (
          <>
            <Field label="Username or email">
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <button className="btn-primary w-full" onClick={handleAdminSignin} disabled={loading}>Admin sign in</button>
          </>
        )}
      </div>


    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
