import type { Metadata } from "next";
import Link from "next/link";
import { ContactModal } from "@/components/landing/contact-modal";

export const metadata: Metadata = {
  title: "LeadLynx — Lead Management CRM | Visual Pipeline & Multi-Channel Outreach",
  description:
    "LeadLynx is a modern CRM for growing teams. Manage leads with visual pipelines, automate WhatsApp & Email outreach, and track your team's performance — all in one place.",
  keywords:
    "lead management CRM, pipeline CRM, WhatsApp CRM, lead tracking software, sales pipeline, team CRM, Meta Ads CRM",
  openGraph: {
    title: "LeadLynx — Lead Management CRM",
    description: "Visual pipelines, multi-channel outreach, and team analytics. Never miss a lead.",
    type: "website",
    siteName: "LeadLynx",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadLynx — Lead Management CRM",
    description: "Visual pipelines, multi-channel outreach, and team analytics. Never miss a lead.",
  },
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:         "#0c0b09",
  card:       "#151311",
  muted:      "#1a1815",
  secondary:  "#1f1c17",
  accent:     "#241f18",
  border:     "#2a2520",
  borderHi:   "#3a342c",
  fg:         "#ede9e1",
  fgMid:      "#c8c2b8",
  fgMuted:    "#918a7e",
  fgDim:      "#5e5850",
  orange:     "#e8622a",
  orangeDim:  "rgba(232,98,42,0.12)",
  green:      "#4aab78",
  blue:       "#5a9be0",
  gold:       "#d4a94e",
  purple:     "#a070f0",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function LynxLogo() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: T.orange }}>
      <svg width="22" height="22" viewBox="0 0 100 100" fill="white">
        <polygon points="8,52 22,8 42,44" />
        <polygon points="92,52 78,8 58,44" />
        <ellipse cx="50" cy="66" rx="38" ry="30" />
      </svg>
    </div>
  );
}

function LynxLargeIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 100 100" fill="white" opacity="0.9">
      <polygon points="8,52 22,8 42,44" />
      <polygon points="92,52 78,8 58,44" />
      <ellipse cx="50" cy="66" rx="38" ry="30" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="4" height="8" rx="1" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const features = [
  { icon: <KanbanIcon />,   color: T.orange,  title: "Visual Pipeline",          description: "Drag-and-drop Kanban boards with custom stages. See every lead's position at a glance and move them forward in one click." },
  { icon: <MessageIcon />,  color: T.purple,  title: "Multi-Channel Outreach",   description: "Send WhatsApp messages, emails, and SMS with pre-built templates and dynamic variables — from one unified inbox." },
  { icon: <ZapIcon />,      color: T.green,   title: "Automated Lead Capture",   description: "Connect Meta Ads, embed website forms, or import CSVs. Leads flow in automatically and get assigned to your team." },
  { icon: <BarChartIcon />, color: T.blue,    title: "Team Analytics",           description: "Track BD performance, conversion rates, stale leads, and pipeline health with real-time dashboards and reports." },
  { icon: <SlidersIcon />,  color: T.gold,    title: "Custom Stage Fields",      description: "Add custom data fields per pipeline stage — text, dates, dropdowns, checkboxes. Capture exactly what your workflow needs." },
  { icon: <UsersIcon />,    color: T.orange,  title: "Role-Based Access",        description: "Super admins, admins, and team members — everyone sees exactly what they need. Secure and flexible by default." },
];

const steps = [
  { title: "Set up your pipeline",      description: "Define your stages, add custom fields, and invite your team. Your first pipeline is ready in under 10 minutes." },
  { title: "Capture and assign leads",  description: "Connect Meta Ads, embed forms, or import a CSV. Leads flow in automatically and get routed to the right BD." },
  { title: "Engage and close",          description: "Send templated WhatsApp and email outreach, track activity, and move leads to closed — all in one place." },
];

const channels = [
  { name: "Stage-triggered messages",  dot: T.orange, description: "Attach a WhatsApp or email template to any stage. The moment a lead moves in, the message fires — no manual action needed." },
  { name: "Personalised at scale",     dot: T.blue,   description: "Templates use dynamic variables like name, phone, and stage so every automated message feels hand-written." },
  { name: "Full activity trail",       dot: T.green,  description: "Every automated message is logged against the lead with a timestamp, so your team always knows what was sent and when." },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureCard({ icon, color, title, description }: { icon: React.ReactNode; color: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl p-6 transition-colors" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: color + "18", color }}>
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold" style={{ color: T.fg }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: T.fgMuted }}>{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="rounded-2xl p-7" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: T.orange }}>
        {step}
      </div>
      <h3 className="mb-2 text-lg font-semibold" style={{ color: T.fg }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: T.fgMuted }}>{description}</p>
    </div>
  );
}

function ChannelRow({ name, dot, description }: { name: string; dot: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: dot }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: T.fg }}>{name}</p>
        <p className="text-sm" style={{ color: T.fgMuted }}>{description}</p>
      </div>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: T.orange }}>✓</span>
      <span className="text-sm" style={{ color: T.fgMuted }}>{text}</span>
    </li>
  );
}

// ─── Preview components ───────────────────────────────────────────────────────

function WindowChrome({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: T.border }}>
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold" style={{ color: T.fgMid }}>{title}</span>
        {badge && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "rgba(74,171,120,0.15)", color: T.green }}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
      </div>
    </div>
  );
}

function PipelinePreview() {
  const cols = [
    { label: "New",       count: 3, cards: [
        { name: "Sarah A.", tag: "Meta Ads", tagBg: "rgba(90,155,224,0.15)", tagFg: T.blue },
        { name: "Rahul M.", tag: "Website",  tagBg: "rgba(74,171,120,0.15)", tagFg: T.green },
        { name: "Priya K.", tag: "Referral", tagBg: "rgba(160,112,240,0.15)", tagFg: T.purple },
    ]},
    { label: "Contacted", count: 2, cards: [
        { name: "James T.", tag: "WhatsApp", tagBg: "rgba(74,171,120,0.15)", tagFg: T.green },
        { name: "Anita B.", tag: "Email",    tagBg: "rgba(90,155,224,0.15)", tagFg: T.blue },
    ]},
    { label: "Closed",    count: 1, cards: [
        { name: "Dev P.",   tag: "Won ✓",   tagBg: "rgba(74,171,120,0.15)", tagFg: T.green },
    ]},
  ];

  return (
    <div className="relative">
      {/* Floating pill — top right */}
      <div className="absolute -top-4 -right-3 z-10 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-lg" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.fgMid }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: T.green }} />
        New lead from Meta Ads
      </div>

      <div className="overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <WindowChrome title="Lead Pipeline" />
        <div className="grid grid-cols-3 gap-3 p-4">
          {cols.map((col) => (
            <div key={col.label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.fgMuted }}>{col.label}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: T.secondary, color: T.fgDim }}>{col.count}</span>
              </div>
              <div className="space-y-2">
                {col.cards.map((c) => (
                  <div key={c.name} className="rounded-lg p-2.5" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
                    <p className="text-xs font-semibold" style={{ color: T.fg }}>{c.name}</p>
                    <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: c.tagBg, color: c.tagFg }}>{c.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating pill — bottom left */}
      <div className="absolute -bottom-4 -left-3 z-10 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-lg" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.fgMid }}>
        <span className="font-bold" style={{ color: T.orange }}>68%</span>
        conversion this month
      </div>
    </div>
  );
}

function PipelineConfigPreview() {
  const stages = [
    { name: "New Inquiry",   color: T.blue,   fields: ["Name", "Phone", "Lead Source"] },
    { name: "Contacted",     color: T.gold,   fields: ["Contact Date", "Notes"] },
    { name: "Qualified",     color: T.purple, fields: ["Score", "Budget Range"] },
    { name: "Proposal Sent", color: T.orange, fields: ["Proposal Value", "Decision Date"] },
    { name: "Closed Won",    color: T.green,  fields: [] },
  ];

  return (
    <div className="overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <WindowChrome title="Pipeline Builder" />
      <div className="space-y-2 p-4">
        {stages.map((stage, i) => (
          <div key={stage.name} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
            <div className="grid grid-cols-2 gap-0.5 flex-none">
              {Array.from({ length: 6 }).map((_, j) => (
                <span key={j} className="h-1 w-1 rounded-full" style={{ backgroundColor: T.fgDim }} />
              ))}
            </div>
            <span className="h-3 w-3 flex-none rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="flex-1 text-sm font-medium" style={{ color: T.fg }}>{stage.name}</span>
            <div className="hidden gap-1.5 sm:flex">
              {stage.fields.slice(0, 2).map((f) => (
                <span key={f} className="rounded px-2 py-0.5 text-[10px]" style={{ backgroundColor: T.accent, color: T.fgMuted }}>{f}</span>
              ))}
              {stage.fields.length > 2 && (
                <span className="rounded px-2 py-0.5 text-[10px]" style={{ color: T.fgDim }}>+{stage.fields.length - 2}</span>
              )}
            </div>
            {i < stages.length - 1
              ? <svg className="h-4 w-4 flex-none" fill="none" stroke={T.fgDim} strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              : <svg className="h-4 w-4 flex-none" fill="none" stroke={T.green} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
            }
          </div>
        ))}
        <button className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm transition-colors" style={{ border: `1px dashed ${T.borderHi}`, color: T.fgDim }}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          Add stage
        </button>
      </div>
    </div>
  );
}

function ExecutiveDashboardPreview() {
  const stats = [
    { label: "Total Leads",   value: "284", color: T.orange },
    { label: "New This Week", value: "47",  color: T.green  },
    { label: "Messages Sent", value: "621", color: T.blue   },
    { label: "Conversion",    value: "34%", color: T.gold   },
  ];

  const funnel = [
    { name: "New",       count: 142, color: T.blue,   pct: 100 },
    { name: "Contacted", count: 89,  color: T.gold,   pct: 63  },
    { name: "Qualified", count: 56,  color: T.purple, pct: 39  },
    { name: "Proposal",  count: 31,  color: T.orange, pct: 22  },
    { name: "Won",       count: 18,  color: T.green,  pct: 13  },
  ];

  const bds = [
    { name: "Rahul S.", n: 45, c: 28, q: 14, w: 8 },
    { name: "Priya M.", n: 38, c: 22, q: 10, w: 5 },
    { name: "Amit K.",  n: 30, c: 18, q:  8, w: 5 },
  ];

  const bars = [8,5,12,7,15,9,6,11,14,8,17,10,6,13,9,16,11,8,14,7,18,12,9,15,10,7,13,16,11,14];

  return (
    <div className="overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <WindowChrome title="Executive Dashboard" badge="● Live" />
      <div className="space-y-3 p-4">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="mt-0.5 text-[9px] leading-tight" style={{ color: T.fgMuted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Funnel + Inflow */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
            <p className="mb-2.5 text-[11px] font-semibold" style={{ color: T.fgMuted }}>Pipeline Funnel</p>
            <div className="space-y-2">
              {funnel.map((f) => (
                <div key={f.name} className="flex items-center gap-2">
                  <span className="w-12 text-right text-[10px]" style={{ color: T.fgDim }}>{f.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: T.accent }}>
                    <div className="h-full rounded-full" style={{ width: `${f.pct}%`, backgroundColor: f.color }} />
                  </div>
                  <span className="w-6 text-[10px] font-semibold tabular-nums" style={{ color: T.fgMid }}>{f.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
            <p className="mb-2.5 text-[11px] font-semibold" style={{ color: T.fgMuted }}>Lead Inflow (30d)</p>
            <div className="flex h-16 items-end gap-px">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${(h / 18) * 100}%`, backgroundColor: i >= 25 ? T.orange : T.orange + "44" }} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[9px]" style={{ color: T.fgDim }}>
              <span>30d ago</span><span>Today</span>
            </div>
          </div>
        </div>

        {/* BD Performance */}
        <div className="rounded-xl p-3" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
          <p className="mb-2.5 text-[11px] font-semibold" style={{ color: T.fgMuted }}>BD Performance</p>
          <table className="w-full text-[10px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.fgDim }}>
                <th className="pb-1.5 pr-2 text-left font-medium">Member</th>
                <th className="px-1 pb-1.5 text-center font-medium">New</th>
                <th className="px-1 pb-1.5 text-center font-medium">Contacted</th>
                <th className="px-1 pb-1.5 text-center font-medium">Qualified</th>
                <th className="px-1 pb-1.5 text-center font-medium" style={{ color: T.green }}>Won</th>
                <th className="pl-1 pb-1.5 text-center font-semibold" style={{ color: T.fgMuted }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {bds.map((bd) => (
                <tr key={bd.name} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td className="py-1.5 pr-2 font-semibold" style={{ color: T.fg }}>{bd.name}</td>
                  <td className="px-1 py-1.5 text-center" style={{ color: T.fgMuted }}>{bd.n}</td>
                  <td className="px-1 py-1.5 text-center" style={{ color: T.fgMuted }}>{bd.c}</td>
                  <td className="px-1 py-1.5 text-center" style={{ color: T.fgMuted }}>{bd.q}</td>
                  <td className="px-1 py-1.5 text-center">
                    <span className="rounded px-1.5 py-0.5 font-semibold" style={{ backgroundColor: "rgba(74,171,120,0.15)", color: T.green }}>{bd.w}</span>
                  </td>
                  <td className="pl-1 py-1.5 text-center font-bold" style={{ color: T.fg }}>{bd.n + bd.c + bd.q + bd.w}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MessagePreview() {
  const events = [
    { time: "09:41", label: "Priya K. moved to", stage: "Contacted", stageColor: T.gold },
    { time: "09:41", label: "Auto-message fired", tag: "WhatsApp", tagColor: "#25D366" },
    { time: "09:41", label: "Rahul M. moved to", stage: "Qualified", stageColor: T.purple },
    { time: "09:41", label: "Auto-message fired", tag: "Email", tagColor: T.blue },
  ];

  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide" style={{ color: T.fgDim }}>Pipeline Automation Log</p>

      {/* Event feed */}
      <div className="space-y-2 mb-5">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
            <span className="text-[10px] tabular-nums flex-none" style={{ color: T.fgDim }}>{e.time}</span>
            <span className="flex-1 text-xs" style={{ color: T.fgMuted }}>{e.label}</span>
            {e.stage && (
              <span className="rounded px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: e.stageColor + "22", color: e.stageColor }}>{e.stage}</span>
            )}
            {e.tag && (
              <span className="rounded px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: e.tagColor + "22", color: e.tagColor }}>✓ {e.tag}</span>
            )}
          </div>
        ))}
      </div>

      {/* Sample auto-sent message */}
      <div className="rounded-xl p-4" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#25D366" }} />
          <span className="text-[11px] font-medium" style={{ color: T.fgMuted }}>Auto-sent via WhatsApp · Contacted stage</span>
        </div>
        <div className="rounded-xl rounded-tl-none px-4 py-3 text-sm text-white" style={{ backgroundColor: "#25D366" }}>
          Hi Priya! 👋 Thanks for your interest. One of our team members will be in touch shortly to understand your needs.
        </div>
      </div>
    </div>
  );
}

function LeadIngestionFlow() {
  const sources = [
    { label: "Meta Ads",    sublabel: "Real-time lead capture",      color: T.blue,   icon: "🎯", count: "+12 today" },
    { label: "Web Form",    sublabel: "Embeddable on any page",      color: T.green,  icon: "🌐", count: "+5 today"  },
    { label: "Referral",    sublabel: "Track word-of-mouth leads",   color: T.purple, icon: "👥", count: "+3 today"  },
    { label: "CSV Import",  sublabel: "Bulk upload in seconds",      color: T.gold,   icon: "📄", count: "Anytime"   },
  ];

  const pipelineLeads = [
    { name: "Priya K.",  source: "Meta Ads", sourceBg: "rgba(90,155,224,0.15)",   sourceFg: T.blue   },
    { name: "Rahul M.",  source: "Web Form", sourceBg: "rgba(74,171,120,0.15)",   sourceFg: T.green  },
    { name: "Sarah A.",  source: "Referral", sourceBg: "rgba(160,112,240,0.15)",  sourceFg: T.purple },
    { name: "James T.",  source: "Meta Ads", sourceBg: "rgba(90,155,224,0.15)",   sourceFg: T.blue   },
    { name: "Anita B.",  source: "CSV",      sourceBg: "rgba(212,169,78,0.15)",   sourceFg: T.gold   },
  ];

  return (
    <div className="overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <WindowChrome title="Lead Ingestion" badge="● Live" />
      <div className="grid grid-cols-2 divide-x" style={{ borderColor: T.border }}>

        {/* Sources */}
        <div className="p-4 space-y-2" style={{ borderRight: `1px solid ${T.border}` }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.fgDim }}>Sources</p>
          {sources.map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
              <span className="text-base">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: T.fg }}>{s.label}</p>
                <p className="text-[10px]" style={{ color: T.fgDim }}>{s.sublabel}</p>
              </div>
              <span className="text-[10px] font-medium tabular-nums" style={{ color: s.color }}>{s.count}</span>
            </div>
          ))}
        </div>

        {/* Pipeline intake */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.fgDim }}>New Leads — Auto-routed</p>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: T.orangeDim, color: T.orange }}>↓ {pipelineLeads.length}</span>
          </div>
          <div className="space-y-2">
            {pipelineLeads.map((l) => (
              <div key={l.name} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
                <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: T.orange + "99" }}>
                  {l.name[0]}
                </div>
                <span className="flex-1 text-xs font-medium" style={{ color: T.fg }}>{l.name}</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: l.sourceBg, color: l.sourceFg }}>{l.source}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: T.accent, border: `1px dashed ${T.border}` }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.fgDim} strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            <span className="text-[11px]" style={{ color: T.fgDim }}>Leads assigned automatically or queued for review</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "LeadLynx",
            applicationCategory: "BusinessApplication",
            description: "Lead management CRM with visual pipelines, multi-channel outreach, and team analytics.",
            offers: { "@type": "Offer", availability: "https://schema.org/InStock" },
            creator: { "@type": "Organization", name: "Pepperlabs" },
          }),
        }}
      />

      <div className="min-h-screen antialiased" style={{ fontFamily: "var(--font-outfit)", backgroundColor: T.bg, color: T.fg }}>

        {/* ── Navbar ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: T.bg + "ee", borderBottom: `1px solid ${T.border}` }}>
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2.5">
              <LynxLogo />
              <span className="text-lg font-bold" style={{ color: T.fg }}>LeadLynx</span>
            </div>
            <div className="hidden items-center gap-8 text-sm font-medium md:flex" style={{ color: T.fgMuted }}>
              <a href="#ingestion"   className="transition-colors hover:text-white">Lead Capture</a>
              <a href="#pipeline"    className="transition-colors hover:text-white">Pipeline</a>
              <a href="#dashboard"   className="transition-colors hover:text-white">Dashboard</a>
              <a href="#channels"    className="transition-colors hover:text-white">Automation</a>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium transition-colors" style={{ color: T.fgMuted, border: `1px solid ${T.border}` }}>
                Login
              </Link>
              <ContactModal
                label="Book a Demo"
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: T.orange }}
              />
            </div>
          </nav>
        </header>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pb-28 md:pt-28">
          <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium" style={{ borderColor: T.border, backgroundColor: T.orangeDim, color: T.orange }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Built for fast-moving teams
              </div>
              <h1 className="mb-5 text-4xl font-bold leading-[1.15] tracking-tight md:text-5xl" style={{ color: T.fg }}>
                Stop losing leads.<br />Start closing them.
              </h1>
              <p className="mb-8 text-lg leading-relaxed" style={{ color: T.fgMuted }}>
                LeadLynx pulls leads from Meta Ads, web forms, and referrals into your pipeline the moment they come in — then keeps them moving with automated engagement at every stage.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ContactModal
                  label="Book a Demo"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:opacity-90"
                  style={{ backgroundColor: T.orange, boxShadow: `0 8px 30px ${T.orange}33` }}
                />
                <a href="#how-it-works" className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold transition-colors" style={{ border: `1px solid ${T.border}`, color: T.fgMid, backgroundColor: T.card }}>
                  See How It Works
                </a>
              </div>
            </div>
            <div className="relative px-4 py-6">
              <PipelinePreview />
            </div>
          </div>
        </section>

        {/* ── Stats bar ───────────────────────────────────────────────────── */}
        <section style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, backgroundColor: T.card }}>
          <div className="mx-auto max-w-6xl px-6 py-10">
            <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[
                { value: "Full",       label: "Pipeline Visibility" },
                { value: "3",          label: "Outreach Channels" },
                { value: "Real-time",  label: "Lead Updates" },
                { value: "Multi-team", label: "Role-based Access" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <dt className="text-3xl font-bold" style={{ color: T.orange }}>{s.value}</dt>
                  <dd className="mt-1 text-sm" style={{ color: T.fgMuted }}>{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Lead Ingestion ──────────────────────────────────────────────── */}
        <section id="ingestion" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: T.fg }}>
                Every source. One pipeline. Zero manual work.
              </h2>
              <p className="mt-4 mb-8 text-lg" style={{ color: T.fgMuted }}>
                LeadLynx connects to every channel you use to acquire leads. The moment someone fills your Meta Ad form, submits your web form, or gets added via referral — they land in the right pipeline, tagged by source, ready to act on.
              </p>
              <ul className="space-y-4">
                {[
                  "Meta Ads leads captured in real-time as they come in",
                  "Embeddable web forms — drop on any landing page",
                  "Referral tracking with full source attribution",
                  "Bulk CSV import for migrating existing leads",
                  "Auto-assigned to a BD or queued for manual review",
                ].map((item) => <CheckItem key={item} text={item} />)}
              </ul>
            </div>
            <div>
              <LeadIngestionFlow />
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold md:text-4xl" style={{ color: T.fg }}>Everything your team needs to close more</h2>
            <p className="mx-auto mt-4 max-w-xl" style={{ color: T.fgMuted }}>
              From lead capture to final close — LeadLynx handles the whole pipeline so your team can focus on building relationships.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section id="how-it-works" style={{ backgroundColor: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: T.fg }}>Up and running in minutes</h2>
              <p className="mt-4" style={{ color: T.fgMuted }}>Three steps from setup to your first closed deal.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {steps.map((s, i) => <StepCard key={s.title} step={i + 1} {...s} />)}
            </div>
          </div>
        </section>

        {/* ── Pipeline Configuration ──────────────────────────────────────── */}
        <section id="pipeline" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <PipelineConfigPreview />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: T.fg }}>Build a pipeline that fits your process</h2>
              <p className="mt-4 mb-8 text-lg" style={{ color: T.fgMuted }}>
                Add stages, attach custom fields, and define your exact workflow. Every team is different — LeadLynx adapts to you, not the other way around.
              </p>
              <ul className="space-y-4">
                {[
                  "Drag-and-drop stage ordering",
                  "Custom fields per stage — text, dates, dropdowns, checkboxes",
                  "Multiple pipelines for different lead types or teams",
                  "Set default stage for all incoming leads",
                ].map((item) => <CheckItem key={item} text={item} />)}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Executive Dashboard ──────────────────────────────────────────── */}
        <section id="dashboard" style={{ backgroundColor: T.card, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold md:text-4xl" style={{ color: T.fg }}>Everything owners and admins need at a glance</h2>
                <p className="mt-4 mb-8 text-lg" style={{ color: T.fgMuted }}>
                  Real-time pipeline health, BD performance, lead sources, and conversion rates — in one executive view built for decision-makers.
                </p>
                <ul className="space-y-4">
                  {[
                    "Live conversion rate and full pipeline funnel",
                    "BD performance matrix — who's closing and who's stalling",
                    "30-day lead inflow trend by day",
                    "Alerts for stale and unassigned leads",
                  ].map((item) => <CheckItem key={item} text={item} />)}
                </ul>
              </div>
              <div>
                <ExecutiveDashboardPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ── Multi-channel outreach ───────────────────────────────────────── */}
        <section id="channels" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: T.fg }}>Engagement that runs itself</h2>
              <p className="mt-4 mb-6 text-lg" style={{ color: T.fgMuted }}>
                Attach message templates to pipeline stages. When a lead moves, the right WhatsApp or email goes out automatically — no one has to remember to follow up.
              </p>
              <div className="space-y-5">
                {channels.map((c) => <ChannelRow key={c.name} {...c} />)}
              </div>
              {/* AI bot teaser */}
              <div className="mt-8 flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: T.secondary, border: `1px solid ${T.border}` }}>
                <span className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide" style={{ backgroundColor: "rgba(160,112,240,0.15)", color: T.purple }}>COMING SOON</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: T.fg }}>AI Conversation Bot</p>
                  <p className="mt-0.5 text-sm" style={{ color: T.fgMuted }}>Automatically qualify and respond to leads over WhatsApp using an AI agent — before your team ever gets involved.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl p-7 shadow-sm" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <MessagePreview />
            </div>
          </div>
        </section>

        {/* ── CTA Banner ──────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-3xl px-8 py-16 text-center text-white" style={{ background: `linear-gradient(135deg, ${T.orange} 0%, #c44e1e 100%)` }}>
            <div className="mb-5 flex justify-center"><LynxLargeIcon /></div>
            <h2 className="text-3xl font-bold md:text-4xl">Never miss another lead.</h2>
            <p className="mx-auto mt-4 max-w-sm text-lg" style={{ color: "rgba(255,255,255,0.75)" }}>
              Get your team on LeadLynx and start closing more — starting today.
            </p>
            <ContactModal
              label="Book a Demo"
              className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ backgroundColor: T.fg, color: T.orange }}
            />
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.card }}>
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2.5">
                <LynxLogo />
                <span className="font-semibold" style={{ color: T.fg }}>LeadLynx</span>
                <span style={{ color: T.fgDim }}>·</span>
                <span className="text-sm" style={{ color: T.fgMuted }}>by Pepperlabs</span>
              </div>
              <div className="flex items-center gap-6 text-sm" style={{ color: T.fgMuted }}>
                <Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
                <Link href="/login"   className="transition-colors hover:text-white">Login</Link>
              </div>
            </div>
            <p className="mt-6 text-center text-xs" style={{ color: T.fgDim }}>
              © {new Date().getFullYear()} Pepperlabs. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}
