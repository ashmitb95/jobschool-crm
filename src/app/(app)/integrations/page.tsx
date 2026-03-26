"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Copy,
  Check,
  Webhook,
  Globe,
  Route,
  Phone,
  Mail,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import type { Pipeline } from "@/types";

interface MetaConnection {
  pageId: string | null;
  pageName: string | null;
  isConnected: boolean;
}

interface MetaForm {
  id: string;
  name: string;
  status: string;
}

interface FormMapping {
  formId: string;
  formName?: string;
  pipelineId: string;
}

interface IntegrationConfig {
  whatsapp: {
    phoneNumberId: string | null;
    accessToken: string | null;
    configured: boolean;
  };
  email: {
    provider: string;
    apiKey: string | null;
    fromAddress: string | null;
    fromName: string | null;
    configured: boolean;
  };
}

export default function IntegrationsPage() {
  const { user, pipelines: authPipelines } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/pipeline");
  }, [user, router]);

  const [loading, setLoading] = useState(true);

  // Meta connection
  const [meta, setMeta] = useState<MetaConnection>({ pageId: null, pageName: null, isConnected: false });
  const [metaPageId, setMetaPageId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [connectingMeta, setConnectingMeta] = useState(false);

  // Forms + Mappings
  const [forms, setForms] = useState<MetaForm[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [savingMappings, setSavingMappings] = useState(false);
  const [migrateLeads, setMigrateLeads] = useState(false);

  // Integration config
  const [config, setConfig] = useState<IntegrationConfig | null>(null);

  // WhatsApp form
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [savingWa, setSavingWa] = useState(false);
  const [testWaPhone, setTestWaPhone] = useState("");
  const [testingWa, setTestingWa] = useState(false);

  // Email form
  const [emailProvider, setEmailProvider] = useState("resend");
  const [emailApiKey, setEmailApiKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  // Copy helpers
  const [copied, setCopied] = useState<string | null>(null);
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [metaRes, intRes, pipelinesRes] = await Promise.all([
        fetch("/api/meta/connection"),
        fetch("/api/integrations"),
        fetch("/api/pipelines"),
      ]);

      if (metaRes.ok) {
        const d = await metaRes.json();
        if (d.success) setMeta(d.data);
      }

      if (intRes.ok) {
        const d = await intRes.json();
        if (d.success) {
          setConfig(d.data);
          setWaPhoneId(d.data.whatsapp.phoneNumberId || "");
          setEmailProvider(d.data.email.provider || "resend");
          setEmailFrom(d.data.email.fromAddress || "");
          setEmailFromName(d.data.email.fromName || "");
        }
      }

      if (pipelinesRes.ok) {
        const d = await pipelinesRes.json();
        setPipelines(d.success ? d.data : d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch forms when meta is connected
  useEffect(() => {
    if (!meta.isConnected) return;
    (async () => {
      const formsRes = await fetch("/api/meta/forms");
      if (formsRes.ok) {
        const d = await formsRes.json();
        const formsList: (MetaForm & { mappedPipelineId?: string | null })[] = d.success ? (d.data.forms || d.data) : [];
        setForms(formsList);

        // Build mappings from the forms response, defaulting unmapped forms to the first pipeline
        const defaultPipelineId = pipelines[0]?.id || "";
        const map: Record<string, string> = {};
        formsList.forEach((f) => {
          map[f.id] = f.mappedPipelineId || defaultPipelineId;
        });
        setMappings(map);
      }
    })();
  }, [meta.isConnected, pipelines]);

  async function connectMeta() {
    setConnectingMeta(true);
    try {
      const res = await fetch("/api/meta/connection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: metaPageId, pageAccessToken: metaToken }),
      });
      const d = await res.json();
      if (d.success) {
        setMeta(d.data);
        setMetaPageId("");
        setMetaToken("");
        toast.success(`Connected to ${d.data.pageName}`);
      } else {
        toast.error(d.error?.message || "Failed to connect");
      }
    } finally {
      setConnectingMeta(false);
    }
  }

  async function saveMappings() {
    setSavingMappings(true);
    try {
      const payload = Object.entries(mappings)
        .filter(([, pId]) => pId)
        .map(([formId, pipelineId]) => {
          const form = forms.find((f) => f.id === formId);
          return { formId, formName: form?.name, pipelineId };
        });
      const res = await fetch("/api/meta/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: payload, migrate: migrateLeads }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Saved ${payload.length} mapping(s)`);
      } else {
        toast.error(d.error?.message || "Failed");
      }
    } finally {
      setSavingMappings(false);
    }
  }

  async function saveWhatsApp() {
    setSavingWa(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: { phoneNumberId: waPhoneId, accessToken: waToken || undefined } }),
      });
      if ((await res.json()).success) {
        toast.success("WhatsApp settings saved");
        setWaToken("");
        fetchAll();
      } else {
        toast.error("Failed to save");
      }
    } finally {
      setSavingWa(false);
    }
  }

  async function testWhatsApp() {
    setTestingWa(true);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "whatsapp", to: testWaPhone }),
      });
      const d = await res.json();
      if (d.success) toast.success("Test message sent!");
      else toast.error(d.error?.message || "Failed");
    } finally {
      setTestingWa(false);
    }
  }

  async function saveEmail() {
    setSavingEmail(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: {
            provider: emailProvider,
            apiKey: emailApiKey || undefined,
            fromAddress: emailFrom,
            fromName: emailFromName,
          },
        }),
      });
      if ((await res.json()).success) {
        toast.success("Email settings saved");
        setEmailApiKey("");
        fetchAll();
      } else {
        toast.error("Failed to save");
      }
    } finally {
      setSavingEmail(false);
    }
  }

  async function testEmail() {
    setTestingEmail(true);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", to: testEmailTo }),
      });
      const d = await res.json();
      if (d.success) toast.success("Test email sent!");
      else toast.error(d.error?.message || "Failed");
    } finally {
      setTestingEmail(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (user?.role !== "admin") return null;

  return (
    <div className="flex flex-col h-full">
      <Header title="Integrations" description="Connect external services and configure channels" />

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">

            {/* 1. Webhook Configuration */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Webhook Configuration</h3>
              </div>
              <p className="text-xs text-muted-foreground">Use these values in your Meta Developer Portal webhook setup.</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Callback URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-xs font-mono bg-muted px-3 py-1.5 rounded border">{origin}/api/webhooks/meta</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(`${origin}/api/webhooks/meta`, "url")}>
                      {copied === "url" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Verify Token</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-xs font-mono bg-muted px-3 py-1.5 rounded border">jobschool_webhook_verify</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard("jobschool_webhook_verify", "token")}>
                      {copied === "token" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Meta Page Connection */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Meta Page Connection</h3>
                </div>
                {meta.isConnected && (
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">{meta.pageName}</Badge>
                )}
              </div>
              {meta.isConnected ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Connected to <strong>{meta.pageName}</strong> (ID: {meta.pageId})</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Disconnect by clearing settings — reuse PATCH with empty values
                      // For now, just reload to show disconnected state
                      toast.info("To disconnect, remove the Meta settings from org settings.");
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Page ID</Label>
                    <Input value={metaPageId} onChange={(e) => setMetaPageId(e.target.value)} placeholder="280263635743685" />
                  </div>
                  <div>
                    <Label className="text-xs">Page Access Token</Label>
                    <Input type="password" value={metaToken} onChange={(e) => setMetaToken(e.target.value)} placeholder="EAAG..." />
                  </div>
                  <Button size="sm" onClick={connectMeta} disabled={connectingMeta || !metaPageId || !metaToken}>
                    {connectingMeta && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                    Connect & Verify
                  </Button>
                </div>
              )}
            </Card>

            {/* 3. Form → Pipeline Routing */}
            {meta.isConnected && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Form → Pipeline Routing</h3>
                </div>
                {forms.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No forms found for this page.</p>
                ) : (
                  <>
                    <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                      {forms.map((form) => (
                        <div key={form.id} className="flex items-center justify-between px-3 py-2 gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-medium truncate">{form.name}</span>
                            <Badge variant={form.status === "ACTIVE" ? "secondary" : "outline"} className="text-[9px] shrink-0">
                              {form.status}
                            </Badge>
                          </div>
                          <Select
                            value={mappings[form.id] || "unmapped"}
                            onValueChange={(v) => setMappings((prev) => ({ ...prev, [form.id]: v === "unmapped" ? "" : v }))}
                          >
                            <SelectTrigger className="w-40 h-7 text-xs">
                              <SelectValue placeholder="Select pipeline..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped">Unmapped</SelectItem>
                              {pipelines.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="migrate-leads"
                        checked={migrateLeads}
                        onCheckedChange={(c) => setMigrateLeads(c === true)}
                      />
                      <label htmlFor="migrate-leads" className="text-xs text-muted-foreground cursor-pointer">
                        Migrate existing leads to new pipeline assignments
                      </label>
                    </div>
                    <Button size="sm" onClick={saveMappings} disabled={savingMappings}>
                      {savingMappings && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                      Save Mappings
                    </Button>
                  </>
                )}
              </Card>
            )}

            <Separator />

            {/* 4. WhatsApp Configuration */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">WhatsApp</h3>
                </div>
                <Badge variant={config?.whatsapp.configured ? "secondary" : "outline"} className={`text-xs ${config?.whatsapp.configured ? "bg-green-500/10 text-green-600" : ""}`}>
                  {config?.whatsapp.configured ? "Configured" : "Not Configured"}
                </Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Phone Number ID</Label>
                  <Input value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="1234567890" />
                </div>
                <div>
                  <Label className="text-xs">Access Token {config?.whatsapp.accessToken && <span className="text-muted-foreground">(current: {config.whatsapp.accessToken})</span>}</Label>
                  <Input type="password" value={waToken} onChange={(e) => setWaToken(e.target.value)} placeholder="Leave blank to keep current" />
                </div>
                <Button size="sm" onClick={saveWhatsApp} disabled={savingWa || !waPhoneId}>
                  {savingWa && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Save
                </Button>
              </div>
              {config?.whatsapp.configured && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs">Send Test Message</Label>
                    <div className="flex gap-2">
                      <Input value={testWaPhone} onChange={(e) => setTestWaPhone(e.target.value)} placeholder="+91 98765 43210" className="flex-1" />
                      <Button size="sm" variant="outline" onClick={testWhatsApp} disabled={testingWa || !testWaPhone}>
                        {testingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* 5. Email Configuration */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Email</h3>
                </div>
                <Badge variant={config?.email.configured ? "secondary" : "outline"} className={`text-xs ${config?.email.configured ? "bg-green-500/10 text-green-600" : ""}`}>
                  {config?.email.configured ? "Configured" : "Not Configured"}
                </Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Provider</Label>
                  <Select value={emailProvider} onValueChange={setEmailProvider}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">API Key {config?.email.apiKey && <span className="text-muted-foreground">(current: {config.email.apiKey})</span>}</Label>
                  <Input type="password" value={emailApiKey} onChange={(e) => setEmailApiKey(e.target.value)} placeholder="Leave blank to keep current" />
                </div>
                <div>
                  <Label className="text-xs">From Address</Label>
                  <Input value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} placeholder="noreply@yourdomain.com" />
                </div>
                <div>
                  <Label className="text-xs">From Name</Label>
                  <Input value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} placeholder="JobSchool" />
                </div>
                <Button size="sm" onClick={saveEmail} disabled={savingEmail}>
                  {savingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Save
                </Button>
              </div>
              {config?.email.configured && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs">Send Test Email</Label>
                    <div className="flex gap-2">
                      <Input value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} placeholder="admin@example.com" className="flex-1" />
                      <Button size="sm" variant="outline" onClick={testEmail} disabled={testingEmail || !testEmailTo}>
                        {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
