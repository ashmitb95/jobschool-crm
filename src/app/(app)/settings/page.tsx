"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
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
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  GripVertical,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Palette,
  FileText,
} from "lucide-react";
import { StageFieldManager } from "@/components/settings/stage-field-manager";
import { MetaFormMapper } from "@/components/settings/meta-form-mapper";
import { PipelineSelector } from "@/components/pipeline/pipeline-selector";
import { useAuth } from "@/lib/auth-context";

/* ---------- types ---------- */

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
  templateId: string | null;
  isDefault: boolean;
  createdAt: string;
  leadCount: number;
}

/* ---------- preset colors ---------- */

const presetColors = [
  "#e8622a",
  "#c49a3c",
  "#3a9e6e",
  "#4a8fd4",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6b7280",
];

/* ---------- stage row ---------- */

function StageRow({
  stage,
  index,
  onFieldsClick,
}: {
  stage: Stage;
  index: number;
  onFieldsClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card hover:border-primary/20 transition-colors group">
      <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: stage.color }}
      />
      <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
        {stage.name}
      </span>
      {stage.isDefault && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          Default
        </Badge>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        Order: {stage.order}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {stage.leadCount} lead{stage.leadCount !== 1 ? "s" : ""}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onFieldsClick}
      >
        <FileText className="w-3.5 h-3.5" />
        Fields
      </Button>
    </div>
  );
}

/* ---------- add stage form ---------- */

function AddStageForm({ onCreated, pipelineId }: { onCreated: () => void; pipelineId: string }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, pipelineId }),
      });
      if (res.ok) {
        setName("");
        setColor("#6b7280");
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Stage Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Technical Assessment"
        />
      </div>
      <div className="space-y-1.5 relative">
        <label className="text-xs font-medium text-muted-foreground">
          Color
        </label>
        <button
          type="button"
          className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-transparent hover:bg-accent transition-colors"
          onClick={() => setShowColorPicker(!showColorPicker)}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: color }}
          />
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        {showColorPicker && (
          <div className="absolute bottom-full mb-2 left-0 z-10 p-2 rounded-md border border-border bg-popover shadow-md">
            <div className="grid grid-cols-5 gap-1.5">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                    color === c ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setColor(c);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
            <Separator className="my-2" />
            <Input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 text-xs font-mono"
              placeholder="#hex"
            />
          </div>
        )}
      </div>
      <Button type="submit" size="sm" disabled={saving || !name.trim()}>
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        Add Stage
      </Button>
    </form>
  );
}

/* ---------- env var status display ---------- */

const envVarGroups = [
  {
    label: "WhatsApp (Twilio)",
    vars: [
      { key: "TWILIO_ACCOUNT_SID", description: "Twilio Account SID" },
      { key: "TWILIO_AUTH_TOKEN", description: "Twilio Auth Token" },
      { key: "TWILIO_WHATSAPP_FROM", description: "WhatsApp sender number" },
    ],
  },
  {
    label: "Meta Ads (Lead Sync)",
    vars: [
      { key: "META_APP_ID", description: "Meta App ID" },
      { key: "META_APP_SECRET", description: "Meta App Secret" },
      { key: "META_ACCESS_TOKEN", description: "Meta Access Token" },
      { key: "META_VERIFY_TOKEN", description: "Webhook verify token" },
    ],
  },
  {
    label: "CV Optimiser",
    vars: [
      { key: "CV_OPTIMISER_URL", description: "CV Optimiser service URL" },
    ],
  },
];

function EnvStatusRow({
  variable,
  description,
}: {
  variable: string;
  description: string;
}) {
  // In the browser we cannot check actual env vars, so we display them as
  // informational items. A real implementation would call an API endpoint
  // that checks which vars are set on the server.
  return (
    <div className="flex items-center gap-3 py-1.5">
      <code className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
        {variable}
      </code>
      <span className="text-xs text-muted-foreground flex-1">
        {description}
      </span>
      <span className="text-xs text-muted-foreground italic">
        Server-side
      </span>
    </div>
  );
}

/* ---------- main page ---------- */

export default function SettingsPage() {
  const { pipelines } = useAuth();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldManagerStage, setFieldManagerStage] = useState<{id: string, name: string} | null>(null);

  // Default to first pipeline
  useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  const fetchStages = useCallback(async () => {
    if (!selectedPipelineId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stages?pipelineId=${selectedPipelineId}`);
      if (!res.ok) throw new Error("Failed to fetch stages");
      const data: Stage[] = await res.json();
      setStages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedPipelineId]);

  useEffect(() => {
    if (selectedPipelineId) {
      fetchStages();
    }
  }, [fetchStages]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Settings" description="Manage pipeline stages and integrations" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Settings" description="Manage pipeline stages and integrations" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStages}>
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Settings"
        description="Manage pipeline stages and integrations"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* ---------- Pipeline Selector ---------- */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Pipeline:</span>
            <PipelineSelector
              pipelines={pipelines}
              value={selectedPipelineId}
              onChange={setSelectedPipelineId}
            />
          </div>

          {/* ---------- Stage Management ---------- */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Pipeline Stages</CardTitle>
              <CardDescription>
                Configure the stages leads progress through in your pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No stages configured yet. Add your first stage below.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {stages.map((stage, i) => (
                    <StageRow
                      key={stage.id}
                      stage={stage}
                      index={i}
                      onFieldsClick={() =>
                        setFieldManagerStage({ id: stage.id, name: stage.name })
                      }
                    />
                  ))}
                </div>
              )}

              <Separator />

              <AddStageForm onCreated={fetchStages} pipelineId={selectedPipelineId} />
            </CardContent>
          </Card>

          {/* ---------- Meta Lead Forms ---------- */}
          <MetaFormMapper pipelines={pipelines} />

          {/* ---------- API Integrations ---------- */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">API Configuration</CardTitle>
              <CardDescription>
                Status of environment variables required for messaging and lead
                sync integrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {envVarGroups.map((group) => (
                <div key={group.label}>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    {group.label}
                  </h4>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 space-y-0.5">
                    {group.vars.map((v) => (
                      <EnvStatusRow
                        key={v.key}
                        variable={v.key}
                        description={v.description}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-xs text-muted-foreground">
                Environment variables are configured in your{" "}
                <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                  .env.local
                </code>{" "}
                file and are only accessible on the server.
              </p>
            </CardContent>
          </Card>

          {/* ---------- CV Optimiser ---------- */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">CV Optimiser</CardTitle>
              <CardDescription>
                External service for optimizing candidate CVs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    CV Optimiser Service
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Powered by the{" "}
                    <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                      CV_OPTIMISER_URL
                    </code>{" "}
                    environment variable. Ensure the service is running and
                    accessible for CV processing features.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={process.env.NEXT_PUBLIC_CV_OPTIMISER_URL || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stage Field Manager Sheet */}
      <StageFieldManager
        stageId={fieldManagerStage?.id ?? ""}
        stageName={fieldManagerStage?.name ?? ""}
        open={fieldManagerStage !== null}
        onOpenChange={(open) => {
          if (!open) setFieldManagerStage(null);
        }}
      />
    </div>
  );
}
