"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  MessageSquare,
  Link2Off,
  FileText,
  AlertTriangle,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

/* ---------- types ---------- */

interface Template {
  id: string;
  name: string;
  body: string;
  channel: string;
  emailTemplateId?: string | null;
  subject?: string | null;
}

interface RegisteredEmailTemplate {
  id: string;
  name: string;
  filename: string;
  subject: string;
}

interface StageData {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  templateId: string | null;
  template: Template | null;
  fieldCount: number;
  leadCount: number;
}

interface StageField {
  id?: string;
  name: string;
  fieldKey?: string;
  fieldType: string;
  required: boolean;
  options?: string | null;
}

const FIELD_TYPES = ["text", "number", "date", "select", "textarea", "checkbox"] as const;

const presetColors = [
  "#e8622a", "#c49a3c", "#3a9e6e", "#4a8fd4", "#8b5cf6",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#6b7280",
];

const sampleVars: Record<string, string> = {
  "{{name}}": "Sarah Ahmed",
  "{{phone}}": "+971 50 123 4567",
  "{{email}}": "sarah@example.com",
  "{{stage}}": "New Lead",
  "{{cv_link}}": "https://leadlynx.io/cv",
};

/* ---------- component ---------- */

interface StageConfigSidebarProps {
  stageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function StageConfigSidebar({
  stageId,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: StageConfigSidebarProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stage, setStage] = useState<StageData | null>(null);

  // Editable state
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [isDefault, setIsDefault] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // All templates for dropdown
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);

  // Create template inline
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplBody, setNewTplBody] = useState("");
  const [newTplChannel, setNewTplChannel] = useState("whatsapp");
  const [newTplEmailTemplateId, setNewTplEmailTemplateId] = useState("");
  const [newTplSubject, setNewTplSubject] = useState("");
  const [creatingTpl, setCreatingTpl] = useState(false);

  // Registered email templates (from super admin)
  const [emailTemplates, setEmailTemplates] = useState<RegisteredEmailTemplate[]>([]);

  // Edit template inline
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [editTplName, setEditTplName] = useState("");
  const [editTplBody, setEditTplBody] = useState("");

  // Fields
  const [fields, setFields] = useState<StageField[]>([]);
  const [showFields, setShowFields] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<string>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchStage = useCallback(async () => {
    if (!stageId) return;
    setLoading(true);
    try {
      const [stageRes, templatesRes, fieldsRes, emailTplRes] = await Promise.all([
        fetch(`/api/stages/${stageId}`),
        fetch("/api/templates"),
        fetch(`/api/stages/${stageId}/fields`),
        fetch("/api/manage/email-templates"),
      ]);

      if (stageRes.ok) {
        const data: StageData = await stageRes.json();
        setStage(data);
        setName(data.name);
        setColor(data.color);
        setIsDefault(data.isDefault);
        setSelectedTemplateId(data.templateId);

        if (data.template) {
          setEditTplName(data.template.name);
          setEditTplBody(data.template.body);
        }
      }

      if (templatesRes.ok) {
        const tpls = await templatesRes.json();
        setAllTemplates(tpls.map((t: Template & Record<string, unknown>) => ({
          id: t.id, name: t.name, body: t.body, channel: t.channel,
          emailTemplateId: t.emailTemplateId as string | null,
          subject: t.subject as string | null,
        })));
      }

      if (emailTplRes.ok) {
        const d = await emailTplRes.json();
        setEmailTemplates(d.success ? d.data : []);
      }

      if (fieldsRes.ok) {
        const f = await fieldsRes.json();
        setFields(f.map((field: Record<string, unknown>) => ({
          id: field.id,
          name: field.name,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          required: field.required,
          options: field.options,
        })));
      }
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    if (open && stageId) {
      fetchStage();
      setShowCreateTemplate(false);
      setShowEditTemplate(false);
      setShowFields(false);
      setConfirmDelete(false);
    }
  }, [open, stageId, fetchStage]);

  async function handleSave() {
    if (!stageId) return;
    setSaving(true);
    try {
      // Save stage basic info
      await fetch(`/api/stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, color, isDefault,
          templateId: selectedTemplateId,
        }),
      });

      // Save fields
      const fieldPayload = fields.map((f, i) => ({
        id: f.id,
        name: f.name,
        fieldKey: f.fieldKey || f.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
        fieldType: f.fieldType,
        required: f.required,
        options: f.options,
        order: i,
      }));
      await fetch(`/api/stages/${stageId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: fieldPayload }),
      });

      // Save template edits if editing
      if (showEditTemplate && selectedTemplateId) {
        await fetch("/api/templates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedTemplateId,
            name: editTplName,
            body: editTplBody,
          }),
        });
      }

      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTemplate() {
    if (!newTplName.trim() || !newTplBody.trim() || !stageId) return;
    setCreatingTpl(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTplName,
          body: newTplBody || (newTplChannel === "email" ? "Email template" : ""),
          channel: newTplChannel,
          stageId,
          ...(newTplChannel === "email" && newTplEmailTemplateId ? { emailTemplateId: newTplEmailTemplateId } : {}),
          ...(newTplChannel === "email" && newTplSubject ? { subject: newTplSubject } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTemplateId(data.id);
        setAllTemplates((prev) => [...prev, { id: data.id, name: newTplName, body: newTplBody, channel: newTplChannel }]);
        setShowCreateTemplate(false);
        setNewTplName("");
        setNewTplBody("");
        setEditTplName(newTplName);
        setEditTplBody(newTplBody);
      }
    } finally {
      setCreatingTpl(false);
    }
  }

  async function handleDelete() {
    if (!stageId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stages/${stageId}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted();
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete stage");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function handleAddField() {
    if (!newFieldName.trim()) return;
    const field: StageField = {
      name: newFieldName.trim(),
      fieldType: newFieldType,
      required: newFieldRequired,
      options: newFieldType === "select" && newFieldOptions.trim()
        ? JSON.stringify(newFieldOptions.split(",").map((o) => o.trim()).filter(Boolean))
        : null,
    };
    setFields((prev) => [...prev, field]);
    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions("");
  }

  const selectedTemplate = allTemplates.find((t) => t.id === selectedTemplateId);

  if (!stageId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            Configure Stage
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 px-1 pb-4">
            {/* ── Section 1: Basic Info ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</h4>
              <div className="space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Stage name"
                />
                <div className="flex flex-wrap gap-1.5">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent hover:border-muted-foreground"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-24 h-6 text-xs font-mono px-2"
                    maxLength={7}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stage-default"
                    checked={isDefault}
                    onCheckedChange={(checked) => setIsDefault(checked === true)}
                  />
                  <label htmlFor="stage-default" className="text-sm text-muted-foreground cursor-pointer">
                    Default stage for new leads
                  </label>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section 2: Message Template ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Message Template
              </h4>

              <div className="space-y-2">
                <Select
                  value={selectedTemplateId || "none"}
                  onValueChange={(v) => {
                    const newId = v === "none" ? null : v;
                    setSelectedTemplateId(newId);
                    setShowEditTemplate(false);
                    if (newId) {
                      const tpl = allTemplates.find((t) => t.id === newId);
                      if (tpl) {
                        setEditTplName(tpl.name);
                        setEditTplBody(tpl.body);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Template preview / edit */}
                {selectedTemplate && !showEditTemplate && (
                  <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{selectedTemplate.name}</span>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-[10px]">{selectedTemplate.channel}</Badge>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setShowEditTemplate(true)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
                          onClick={() => { setSelectedTemplateId(null); setShowEditTemplate(false); }}
                        >
                          <Link2Off className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedTemplate.body}</p>
                  </div>
                )}

                {/* Edit template inline */}
                {selectedTemplate && showEditTemplate && (
                  <div className="rounded-md border border-primary/30 bg-muted/20 p-3 space-y-2">
                    <Input
                      value={editTplName}
                      onChange={(e) => setEditTplName(e.target.value)}
                      placeholder="Template name"
                      className="text-sm"
                    />
                    <div className="flex flex-wrap gap-1 mb-1">
                      {Object.keys(sampleVars).map((v) => (
                        <button
                          key={v}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-mono"
                          onClick={() => setEditTplBody((prev) => prev + " " + v)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={editTplBody}
                      onChange={(e) => setEditTplBody(e.target.value)}
                      rows={4}
                      className="font-mono text-xs"
                      placeholder="Hi {{name}}, welcome..."
                    />
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowEditTemplate(false)}>
                      Done Editing
                    </Button>
                  </div>
                )}

                {/* Create template inline */}
                {!showCreateTemplate ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowCreateTemplate(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create New Template
                  </Button>
                ) : (
                  <div className="rounded-md border border-primary/30 bg-muted/20 p-3 space-y-2">
                    <Input
                      value={newTplName}
                      onChange={(e) => setNewTplName(e.target.value)}
                      placeholder="Template name"
                      className="text-sm"
                    />
                    <div className="flex flex-wrap gap-1 mb-1">
                      {Object.keys(sampleVars).map((v) => (
                        <button
                          key={v}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-mono"
                          onClick={() => setNewTplBody((prev) => prev + " " + v)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={newTplBody}
                      onChange={(e) => setNewTplBody(e.target.value)}
                      rows={4}
                      className="font-mono text-xs"
                      placeholder="Hi {{name}}, welcome to LeadLynx..."
                    />
                    <Select value={newTplChannel} onValueChange={(v) => { setNewTplChannel(v); setNewTplEmailTemplateId(""); setNewTplSubject(""); }}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                    {newTplChannel === "email" && (
                      <>
                        <Select value={newTplEmailTemplateId} onValueChange={setNewTplEmailTemplateId}>
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="Select email template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {emailTemplates.map((et) => (
                              <SelectItem key={et.id} value={et.id}>{et.name} ({et.filename})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={newTplSubject}
                          onChange={(e) => setNewTplSubject(e.target.value)}
                          placeholder="Subject: Welcome {{name}}!"
                          className="text-sm"
                        />
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowCreateTemplate(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleCreateTemplate}
                        disabled={creatingTpl || !newTplName.trim() || !newTplBody.trim()}
                      >
                        {creatingTpl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Create
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* ── Section 3: Stage Fields ── */}
            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                onClick={() => setShowFields(!showFields)}
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Stage Fields ({fields.length})
                </span>
                {showFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showFields && (
                <div className="space-y-3">
                  {/* Existing fields */}
                  {fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No fields configured.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {fields.map((field, index) => (
                        <div
                          key={`${field.name}-${index}`}
                          className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
                        >
                          <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">{field.name}</span>
                          <Badge variant="secondary" className="text-[9px] shrink-0">{field.fieldType}</Badge>
                          {field.required && (
                            <Badge variant="outline" className="text-[9px] shrink-0 border-destructive text-destructive">Req</Badge>
                          )}
                          <Checkbox
                            checked={field.required}
                            onCheckedChange={() => {
                              setFields((prev) => prev.map((f, i) => i === index ? { ...f, required: !f.required } : f));
                            }}
                            aria-label="Toggle required"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add field form */}
                  <div className="rounded-md border border-dashed border-border p-2.5 space-y-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Add Field</p>
                    <Input
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Field name"
                      className="h-7 text-xs"
                    />
                    <Select value={newFieldType} onValueChange={setNewFieldType}>
                      <SelectTrigger className="h-7 text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newFieldType === "select" && (
                      <Input
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        placeholder="Options (comma-separated)"
                        className="h-7 text-xs"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sidebar-new-field-req"
                        checked={newFieldRequired}
                        onCheckedChange={(checked) => setNewFieldRequired(checked === true)}
                      />
                      <label htmlFor="sidebar-new-field-req" className="text-xs text-muted-foreground cursor-pointer">Required</label>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAddField} disabled={!newFieldName.trim()} className="w-full h-7 text-xs">
                      <Plus className="w-3 h-3" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* ── Section 4: Danger Zone ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-destructive/70 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Danger Zone
              </h4>
              {stage && stage.leadCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {stage.leadCount} lead{stage.leadCount !== 1 ? "s" : ""} assigned. Move them before deleting.
                </p>
              )}
              {!confirmDelete ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                  disabled={!!(stage && stage.leadCount > 0)}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Stage
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Confirm Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Save Button ── */}
        <div className="shrink-0 p-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
