"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Link2,
  Unlink,
} from "lucide-react";
import type { Pipeline } from "@/types";

interface MetaForm {
  id: string;
  name: string;
  status: string;
  mappedPipelineId: string | null;
}

interface ConnectionState {
  pageId: string | null;
  pageName: string | null;
  isConnected: boolean;
}

const DEFAULT_PIPELINE_VALUE = "__default__";

export function MetaFormMapper({ pipelines }: { pipelines: Pipeline[] }) {
  // Connection state
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [pageIdInput, setPageIdInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Forms state
  const [forms, setForms] = useState<MetaForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);

  // Mappings state
  const [localMappings, setLocalMappings] = useState<Map<string, string>>(new Map());
  const [migrateLeads, setMigrateLeads] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  // Load connection status on mount
  useEffect(() => {
    fetch("/api/meta/connection")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setConnection(data.data);
      })
      .catch(() => {});
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/meta/connection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: pageIdInput.trim(), pageAccessToken: tokenInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setConnection(data.data);
        setTokenInput("");
      } else {
        setConnectError(data.error?.message || "Connection failed");
      }
    } catch {
      setConnectError("Network error");
    } finally {
      setConnecting(false);
    }
  };

  const fetchForms = useCallback(async () => {
    setLoadingForms(true);
    setFormsError(null);
    try {
      const res = await fetch("/api/meta/forms");
      const data = await res.json();
      if (data.success) {
        setForms(data.data.forms);
        // Initialize local mappings from existing
        const map = new Map<string, string>();
        for (const f of data.data.forms) {
          if (f.mappedPipelineId) {
            map.set(f.id, f.mappedPipelineId);
          }
        }
        setLocalMappings(map);
      } else {
        setFormsError(data.error?.message || "Failed to fetch forms");
      }
    } catch {
      setFormsError("Network error");
    } finally {
      setLoadingForms(false);
    }
  }, []);

  // Load forms when connected
  useEffect(() => {
    if (connection?.isConnected) {
      fetchForms();
    }
  }, [connection?.isConnected, fetchForms]);

  const handleMappingChange = (formId: string, pipelineId: string) => {
    const next = new Map(localMappings);
    if (pipelineId === DEFAULT_PIPELINE_VALUE) {
      next.delete(formId);
    } else {
      next.set(formId, pipelineId);
    }
    setLocalMappings(next);
    setSaveResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const mappings = Array.from(localMappings.entries()).map(([formId, pipelineId]) => {
        const form = forms.find((f) => f.id === formId);
        return { formId, formName: form?.name, pipelineId };
      });

      const res = await fetch("/api/meta/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings, migrate: migrateLeads }),
      });
      const data = await res.json();
      if (data.success) {
        const msg = `Saved ${data.data.saved} mapping(s)`;
        setSaveResult(data.data.migrated > 0 ? `${msg}, migrated ${data.data.migrated} lead(s)` : msg);
      } else {
        setSaveResult(`Error: ${data.error?.message}`);
      }
    } catch {
      setSaveResult("Error: Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Meta Lead Forms</CardTitle>
        <CardDescription>
          Connect your Facebook Page and route lead forms to specific pipelines.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ─── Connection Section ─── */}
        {!connection?.isConnected ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Page ID</label>
              <Input
                value={pageIdInput}
                onChange={(e) => setPageIdInput(e.target.value)}
                placeholder="e.g. 280263635743685"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Page Access Token</label>
              <Input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Permanent page access token"
              />
            </div>
            {connectError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {connectError}
              </div>
            )}
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={connecting || !pageIdInput.trim() || !tokenInput.trim()}
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Connect Page
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-4 py-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{connection.pageName}</p>
              <p className="text-xs text-muted-foreground">Page ID: {connection.pageId}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setConnection({ pageId: null, pageName: null, isConnected: false });
                setForms([]);
                setLocalMappings(new Map());
              }}
            >
              <Unlink className="w-3.5 h-3.5" />
              Disconnect
            </Button>
          </div>
        )}

        {/* ─── Form Routing Section ─── */}
        {connection?.isConnected && (
          <>
            <Separator />

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Form Routing</h4>
              <Button variant="outline" size="sm" onClick={fetchForms} disabled={loadingForms}>
                {loadingForms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Refresh
              </Button>
            </div>

            {formsError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {formsError}
              </div>
            )}

            {loadingForms ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : forms.length > 0 ? (
              <div className="space-y-2">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{form.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{form.id}</p>
                    </div>
                    <Badge
                      variant={form.status === "ACTIVE" ? "secondary" : "outline"}
                      className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                    >
                      {form.status}
                    </Badge>
                    <Select
                      value={localMappings.get(form.id) || DEFAULT_PIPELINE_VALUE}
                      onValueChange={(v) => handleMappingChange(form.id, v)}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DEFAULT_PIPELINE_VALUE}>Default Pipeline</SelectItem>
                        {pipelines.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                <Separator />

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="migrate"
                    checked={migrateLeads}
                    onCheckedChange={(c) => setMigrateLeads(c === true)}
                  />
                  <label htmlFor="migrate" className="text-xs text-muted-foreground cursor-pointer">
                    Migrate existing leads to new pipelines based on form name
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save Mappings
                  </Button>
                  {saveResult && (
                    <span className={`text-xs ${saveResult.startsWith("Error") ? "text-destructive" : "text-muted-foreground"}`}>
                      {saveResult}
                    </span>
                  )}
                </div>
              </div>
            ) : !formsError ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No lead forms found on this page.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
