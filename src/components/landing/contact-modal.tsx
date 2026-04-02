"use client";

import { useState } from "react";

const T = {
  bg:        "#0c0b09",
  card:      "#151311",
  secondary: "#1f1c17",
  accent:    "#241f18",
  border:    "#2a2520",
  fg:        "#ede9e1",
  fgMid:     "#c8c2b8",
  fgMuted:   "#918a7e",
  fgDim:     "#5e5850",
  orange:    "#e8622a",
  green:     "#4aab78",
};

type Props = {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function ContactModal({ label = "Book a Demo", className, style }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const waNumber    = process.env.NEXT_PUBLIC_SALES_WHATSAPP;
  const salesEmail  = process.env.NEXT_PUBLIC_SALES_EMAIL;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name:    fd.get("name") as string,
      phone:   fd.get("phone") as string,
      email:   fd.get("email") as string,
      company: fd.get("company") as string,
      message: fd.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => { setSuccess(false); setError(null); }, 300);
  }

  return (
    <>
      {/* Trigger button */}
      <button onClick={() => setOpen(true)} className={className} style={style}>
        {label}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
            onClick={handleClose}
          />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, fontFamily: "var(--font-outfit)" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: T.fg }}>Get in touch</h2>
                <p className="mt-1 text-sm" style={{ color: T.fgMuted }}>
                  Our team will show you what LeadLynx can do for your business.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="ml-4 flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-colors"
                style={{ color: T.fgMuted, backgroundColor: T.secondary }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {success ? (
              <SuccessState onClose={handleClose} />
            ) : (
              <div className="px-6 pb-6 space-y-4">
                {/* Quick contact */}
                <div className="grid grid-cols-2 gap-3">
                  {waNumber && (
                    <a
                      href={`https://wa.me/${waNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hi! I'd like to know more about LeadLynx.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                      style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}`, color: T.fgMid }}
                    >
                      <WhatsAppIcon />
                      WhatsApp us
                    </a>
                  )}
                  {salesEmail && (
                    <a
                      href={`mailto:${salesEmail}?subject=${encodeURIComponent("Demo Request — LeadLynx")}`}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                      style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}`, color: T.fgMid }}
                    >
                      <EmailIcon />
                      Email us
                    </a>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t" style={{ borderColor: T.border }} />
                  <span className="text-xs" style={{ color: T.fgDim }}>or book a demo</span>
                  <div className="flex-1 border-t" style={{ borderColor: T.border }} />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field name="name"  label="Name *"  placeholder="Your name"  required />
                    <Field name="phone" label="Phone *" placeholder="+91 XXXXX XXXXX" required />
                  </div>
                  <Field name="email"   label="Email"   placeholder="you@company.com" type="email" />
                  <Field name="company" label="Company" placeholder="Company name" />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium" style={{ color: T.fgMuted }}>Message</label>
                    <textarea
                      name="message"
                      rows={3}
                      placeholder="Tell us about your team size, current process, or anything specific you'd like to see..."
                      className="w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[#5e5850]"
                      style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}`, color: T.fg }}
                    />
                  </div>

                  {error && <p className="text-sm" style={{ color: "#dc4a3a" }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: T.orange }}
                  >
                    {loading ? <Spinner /> : <>Book a Demo <ArrowRight /></>}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ name, label, placeholder, type = "text", required }: {
  name: string; label: string; placeholder: string; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: T.fgMuted }}>{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[#5e5850]"
        style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}`, color: T.fg }}
      />
    </div>
  );
}

function SuccessState({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-6 pb-8 pt-4 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(74,171,120,0.15)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 className="text-lg font-bold" style={{ color: T.fg }}>You&apos;re on the list!</h3>
      <p className="mt-2 text-sm" style={{ color: T.fgMuted }}>
        We&apos;ve received your request and will reach out within 24 hours to schedule your demo.
      </p>
      <button
        onClick={onClose}
        className="mt-6 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: T.orange }}
      >
        Done
      </button>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.859L.054 23.25a.75.75 0 00.918.919l5.451-1.465A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.511-5.193-1.403l-.37-.216-3.835 1.032 1.048-3.76-.232-.377A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.fgMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
