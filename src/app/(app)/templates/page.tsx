"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  Paperclip,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/* ---------- types ---------- */

interface Stage {
  id: string;
  name: string;
  color: string;
  pipelineName: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  channel: string;
  attachmentUrl: string | null;
  waTemplateName: string | null;
  waTemplateLanguage: string | null;
  createdAt: string;
  updatedAt: string;
  stageId: string | null;
  stageName: string | null;
  stage: { id: string; name: string } | null;
}

interface EditingState {
  name: string;
  body: string;
  channel: string;
  attachmentUrl: string;
  stageId: string;
  waTemplateName: string;
  waTemplateLanguage: string;
}

/* ---------- sample data for preview ---------- */

const sampleData: Record<string, string> = {
  "{{name}}": "Sarah Ahmed",
  "{{phone}}": "+971 50 123 4567",
  "{{email}}": "sarah@example.com",
  "{{stage}}": "Interview Prep",
  "{{cv_link}}": "https://leadlynx.io/cv/sarah-ahmed",
};

function renderPreview(body: string): string {
  let rendered = body;
  for (const [variable, value] of Object.entries(sampleData)) {
    rendered = rendered.replaceAll(variable, value);
  }
  return rendered;
}

/* ---------- helpers ---------- */

function groupStagesByPipeline(stages: Stage[]): Record<string, Stage[]> {
  const groups: Record<string, Stage[]> = {};
  for (const s of stages) {
    const key = s.pipelineName || "Unassigned";
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return groups;
}

/* ---------- channel labels ---------- */

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
};

/* ---------- template card ---------- */

function TemplateCard({
  template,
  stages,
  onSave,
}: {
  template: Template;
  stages: Stage[];
  onSave: (id: string, data: EditingState) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditingState>({
    name: template.name,
    body: template.body,
    channel: template.channel,
    attachmentUrl: template.attachmentUrl || "",
    stageId: template.stage?.id || "",
    waTemplateName: template.waTemplateName || "",
    waTemplateLanguage: template.waTemplateLanguage || "en",
  });

  useEffect(() => {
    if (!expanded) {
      setEditing({
        name: template.name,
        body: template.body,
        channel: template.channel,
        attachmentUrl: template.attachmentUrl || "",
        stageId: template.stage?.id || "",
        waTemplateName: template.waTemplateName || "",
        waTemplateLanguage: template.waTemplateLanguage || "en",
      });
    }
  }, [template, expanded]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(template.id, editing);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <MessageSquare className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {template.name}
            </span>
            {template.stage && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {template.stage.name}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {channelLabels[template.channel] || template.channel}
            </Badge>
          </div>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {template.body}
            </p>
          )}
        </div>
        {template.attachmentUrl && (
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Template Name</label>
            <Input value={editing.name} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Welcome Message" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Message Body</label>
              <div className="flex flex-wrap gap-1">
                {Object.keys(sampleData).map((v) => (
                  <button key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono" onClick={() => setEditing((s) => ({ ...s, body: s.body + " " + v }))}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <Textarea value={editing.body} onChange={(e) => setEditing((s) => ({ ...s, body: e.target.value }))} rows={4} placeholder="Hi {{name}}, welcome to LeadLynx..." className="font-mono text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Channel</label>
              <Select value={editing.channel} onValueChange={(v) => setEditing((s) => ({ ...s, channel: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Linked Stage</label>
              <Select value={editing.stageId || "none"} onValueChange={(v) => setEditing((s) => ({ ...s, stageId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {Object.entries(groupStagesByPipeline(stages)).map(([pipelineName, pStages]) => (
                    <div key={pipelineName}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{pipelineName}</div>
                      {pStages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Attachment URL</label>
            <Input value={editing.attachmentUrl} onChange={(e) => setEditing((s) => ({ ...s, attachmentUrl: e.target.value }))} placeholder="https://..." />
          </div>

          {editing.channel === "whatsapp" && (
            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">WhatsApp Approved Template (required for first contact)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">WA Template Name</label>
                  <Input value={editing.waTemplateName} onChange={(e) => setEditing((s) => ({ ...s, waTemplateName: e.target.value }))} placeholder="e.g. welcome_new_lead" className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Language Code</label>
                  <Input value={editing.waTemplateLanguage} onChange={(e) => setEditing((s) => ({ ...s, waTemplateLanguage: e.target.value }))} placeholder="en" className="font-mono text-xs" />
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="w-3.5 h-3.5" />
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
            {showPreview && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Preview with sample data</p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{renderPreview(editing.body)}</p>
                {editing.attachmentUrl && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate">{editing.attachmentUrl}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- new template form ---------- */

function NewTemplateForm({
  stages,
  onCreated,
  onCancel,
}: {
  stages: Stage[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", body: "", channel: "whatsapp", attachmentUrl: "", stageId: "",
    waTemplateName: "", waTemplateLanguage: "en",
  });

  async function handleCreate() {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, body: form.body, channel: form.channel,
          attachmentUrl: form.attachmentUrl || null,
          stageId: form.stageId || null,
          waTemplateName: form.waTemplateName || null,
          waTemplateLanguage: form.waTemplateLanguage || "en",
        }),
      });
      if (res.ok) onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">New Template</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Follow-up Message" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Message Body</label>
          <div className="flex flex-wrap gap-1">
            {Object.keys(sampleData).map((v) => (
              <button key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono" onClick={() => setForm((s) => ({ ...s, body: s.body + " " + v }))}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <Textarea value={form.body} onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))} rows={4} placeholder="Hi {{name}}, welcome to LeadLynx..." className="font-mono text-xs" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Channel</label>
          <Select value={form.channel} onValueChange={(v) => setForm((s) => ({ ...s, channel: v }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Linked Stage</label>
          <Select value={form.stageId || "none"} onValueChange={(v) => setForm((s) => ({ ...s, stageId: v === "none" ? "" : v }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.body && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Preview</p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{renderPreview(form.body)}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={handleCreate} disabled={saving || !form.name.trim() || !form.body.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Template
        </Button>
      </div>
    </div>
  );
}

/* ---------- main page ---------- */

export default function TemplatesPage() {
  const { pipelines } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchData = useCallback(async () => {
    if (pipelines.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch templates + stages from ALL accessible pipelines
      const stagePromises = pipelines.map(async (p) => {
        const res = await fetch(`/api/stages?pipelineId=${p.id}`);
        if (!res.ok) return [];
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.data || data;
        return arr.map((s: Stage & { leadCount?: number }) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          pipelineName: p.name,
        }));
      });

      const [tplRes, ...stageResults] = await Promise.all([
        fetch("/api/templates"),
        ...stagePromises,
      ]);

      if (!tplRes.ok) throw new Error("Failed to fetch templates");
      const tplData = await tplRes.json();
      setTemplates(Array.isArray(tplData) ? tplData : tplData.data || tplData);
      setStages(stageResults.flat() as Stage[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [pipelines]);

  useEffect(() => {
    if (pipelines.length > 0) fetchData();
  }, [fetchData, pipelines]);

  async function handleSave(id: string, data: EditingState) {
    const res = await fetch("/api/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id, name: data.name, body: data.body, channel: data.channel,
        attachmentUrl: data.attachmentUrl || null,
        stageId: data.stageId || null,
        waTemplateName: data.waTemplateName || null,
        waTemplateLanguage: data.waTemplateLanguage || "en",
      }),
    });
    if (res.ok) await fetchData();
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Templates" description="Manage message templates" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Templates" description="Manage message templates" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Templates"
        description="Manage message templates"
        actions={
          <Button size="sm" onClick={() => setShowNewForm(!showNewForm)} variant={showNewForm ? "outline" : "default"}>
            {showNewForm ? <><X className="w-4 h-4" />Cancel</> : <><Plus className="w-4 h-4" />Add Template</>}
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {showNewForm && (
            <NewTemplateForm
              stages={stages}
              onCreated={() => { setShowNewForm(false); fetchData(); }}
              onCancel={() => setShowNewForm(false)}
            />
          )}

          {templates.length === 0 && !showNewForm && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No templates yet</p>
              <p className="text-xs mt-1">Create your first message template to get started.</p>
            </div>
          )}

          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} stages={stages} onSave={handleSave} />
          ))}
        </div>
      </div>
    </div>
  );
}
