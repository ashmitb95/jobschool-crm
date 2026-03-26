"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  filename: string;
  subject: string;
  variables: string | null;
  createdAt: string;
}

interface AvailableTemplate {
  filename: string;
  variables: string[];
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [available, setAvailable] = useState<AvailableTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Register dialog
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: "", description: "", filename: "", subject: "" });
  const [registering, setRegistering] = useState(false);

  // Edit dialog
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", subject: "" });
  const [saving, setSaving] = useState(false);

  // Preview dialog
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, availableRes] = await Promise.all([
        fetch("/api/manage/email-templates"),
        fetch("/api/manage/email-templates/available"),
      ]);
      if (templatesRes.ok) {
        const d = await templatesRes.json();
        setTemplates(d.success ? d.data : []);
      }
      if (availableRes.ok) {
        const d = await availableRes.json();
        setAvailable(d.success ? d.data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleRegister() {
    setRegistering(true);
    try {
      const res = await fetch("/api/manage/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      if (res.ok) {
        toast.success("Template registered");
        setShowRegister(false);
        setRegisterForm({ name: "", description: "", filename: "", subject: "" });
        fetchData();
      } else {
        const d = await res.json();
        toast.error(d.error?.message || "Failed");
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleEdit() {
    if (!editTemplate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/manage/email-templates/${editTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success("Template updated");
        setEditTemplate(null);
        fetchData();
      } else {
        const d = await res.json();
        toast.error(d.error?.message || "Failed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/manage/email-templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template unregistered");
      fetchData();
    } else {
      const d = await res.json();
      toast.error(d.error?.message || "Failed");
    }
  }

  async function handlePreview(id: string) {
    setPreviewId(id);
    try {
      const res = await fetch(`/api/manage/email-templates/preview/${id}`);
      if (res.ok) {
        setPreviewHtml(await res.text());
      } else {
        setPreviewHtml("<p>Failed to load preview</p>");
      }
    } catch {
      setPreviewHtml("<p>Failed to load preview</p>");
    }
  }

  function openEdit(tpl: EmailTemplate) {
    setEditTemplate(tpl);
    setEditForm({ name: tpl.name, description: tpl.description || "", subject: tpl.subject });
  }

  // filenames already registered
  const registeredFilenames = new Set(templates.map((t) => t.filename));

  return (
    <div className="flex flex-col h-full">
      <Header title="Email Templates" description="Register and preview HTML email templates" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Registered Templates ({templates.length})</h2>
          <Button size="sm" onClick={() => setShowRegister(true)}>
            <Plus className="w-4 h-4 mr-1" />Register Template
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : templates.length === 0 ? (
          <div className="border rounded-lg px-4 py-12 text-center text-sm text-muted-foreground">
            No email templates registered yet. Register one to get started.
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {templates.map((tpl) => {
              const vars: string[] = tpl.variables ? JSON.parse(tpl.variables) : [];
              return (
                <div key={tpl.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tpl.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{tpl.filename}</Badge>
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Subject: <span className="font-mono">{tpl.subject}</span>
                    </p>
                    {vars.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {vars.map((v) => (
                          <Badge key={v} variant="outline" className="text-[10px] font-mono">{`{{${v}}}`}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(tpl.id)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tpl)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(tpl.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Register Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Email Template</DialogTitle>
            <DialogDescription>Link an HTML file from disk to make it available for stage messaging.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} placeholder="Welcome Email V2" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={registerForm.description} onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })} placeholder="Branded welcome email with CTA" />
            </div>
            <div>
              <Label>Template File</Label>
              <Select value={registerForm.filename} onValueChange={(v) => setRegisterForm({ ...registerForm, filename: v })}>
                <SelectTrigger><SelectValue placeholder="Select a file..." /></SelectTrigger>
                <SelectContent>
                  {available.map((a) => (
                    <SelectItem key={a.filename} value={a.filename} disabled={registeredFilenames.has(a.filename)}>
                      {a.filename} {registeredFilenames.has(a.filename) ? "(registered)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {registerForm.filename && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {available.find((a) => a.filename === registerForm.filename)?.variables.map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px] font-mono">{`{{${v}}}`}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input value={registerForm.subject} onChange={(e) => setRegisterForm({ ...registerForm, subject: e.target.value })} placeholder="Welcome {{name}}!" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegister(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={registering || !registerForm.name || !registerForm.filename || !registerForm.subject}>
              {registering && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the name, description, or subject line.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewId} onOpenChange={(open) => { if (!open) { setPreviewId(null); setPreviewHtml(""); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Rendered with sample data.</DialogDescription>
          </DialogHeader>
          <div className="border rounded-md overflow-auto max-h-[60vh]">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[500px] border-0"
              title="Email Preview"
              sandbox=""
            />
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Unregister Template"
        description="This will unregister the template. The HTML file on disk will not be deleted."
        actionLabel="Unregister"
        variant="destructive"
        onConfirm={() => { if (deleteId) handleDelete(deleteId); }}
      />
    </div>
  );
}
