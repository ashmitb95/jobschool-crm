"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import {
  Phone,
  GripVertical,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { StageTransitionDialog } from "@/components/pipeline/stage-transition-dialog";
import { useAuth } from "@/lib/auth-context";
import { PipelineSelector } from "@/components/pipeline/pipeline-selector";
import {
  PipelineFilters,
  EMPTY_FILTERS,
  type PipelineFilterValues,
} from "@/components/pipeline/pipeline-filters";

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

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  source: string;
  stageId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  stage: {
    id: string;
    name: string | null;
    color: string | null;
    order: number | null;
  };
}

interface Transition {
  id: string;
  fromStageId: string;
  toStageId: string;
}

/* ---------- source badge color map ---------- */

const sourceColors: Record<string, string> = {
  meta_ads: "bg-blue/20 text-blue",
  manual: "bg-muted text-muted-foreground",
  website: "bg-green/20 text-green",
  referral: "bg-gold/20 text-gold",
};

const sourceLabels: Record<string, string> = {
  meta_ads: "Meta",
  manual: "Manual",
  website: "Web",
  referral: "Referral",
};

/* ---------- sortable lead card ---------- */

function SortableLeadCard({ lead }: { lead: Lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { type: "lead", lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 rounded-md border border-border bg-card p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {lead.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {lead.phone}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 h-4 leading-none ${sourceColors[lead.source] || "bg-muted text-muted-foreground"}`}
          >
            {sourceLabels[lead.source] || lead.source}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(lead.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- static card for drag overlay ---------- */

function LeadCardOverlay({ lead }: { lead: Lead }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-primary/50 bg-card p-2.5 shadow-lg shadow-primary/10 w-[240px]">
      <GripVertical className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {lead.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {lead.phone}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 h-4 leading-none ${sourceColors[lead.source] || "bg-muted text-muted-foreground"}`}
          >
            {sourceLabels[lead.source] || lead.source}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(lead.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- droppable stage column ---------- */

function StageColumn({
  stage,
  leads,
  isDragging,
  isValidTarget,
  isSource,
}: {
  stage: Stage;
  leads: Lead[];
  isDragging: boolean;
  isValidTarget: boolean;
  isSource: boolean;
}) {
  const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);

  let columnClass = "flex flex-col w-[272px] shrink-0 h-full transition-opacity duration-150";
  if (isDragging && !isValidTarget && !isSource) {
    columnClass += " opacity-30 pointer-events-none";
  }

  let dropZoneClass = "flex-1 overflow-y-auto rounded-lg p-2 space-y-1.5 min-h-[120px] transition-all duration-150";
  if (isDragging && isValidTarget) {
    dropZoneClass += " bg-primary/10 ring-1 ring-primary/40";
  } else {
    dropZoneClass += " bg-muted/40";
  }

  return (
    <div className={columnClass}>
      {/* column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 mb-2">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="text-sm font-semibold text-foreground truncate">
          {stage.name}
        </h3>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {leads.length}
        </span>
      </div>

      {/* cards area */}
      <div className={dropZoneClass}>
        <SortableContext
          items={leadIds}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No leads
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- main page ---------- */

export default function PipelinePageWrapper() {
  return <Suspense><PipelinePageInner /></Suspense>;
}

function PipelinePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pipelines, loading: authLoading } = useAuth();

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [filters, setFilters] = useState<PipelineFilterValues>(EMPTY_FILTERS);
  const [pendingTransition, setPendingTransition] = useState<{
    leadId: string;
    leadName: string;
    fromStageId: string;
    toStageId: string;
    toStageName: string;
    toStageColor: string;
  } | null>(null);
  const leadsSnapshotRef = useRef<Lead[]>([]);

  /* --- pipeline selection (persisted in URL) --- */

  const pipelineIdFromUrl = searchParams.get("pipelineId") ?? "";

  // Resolve selected pipeline: URL param > first accessible pipeline
  const selectedPipelineId = useMemo(() => {
    if (pipelines.length === 0) return "";
    if (pipelineIdFromUrl && pipelines.some((p) => p.id === pipelineIdFromUrl)) {
      return pipelineIdFromUrl;
    }
    return pipelines[0].id;
  }, [pipelines, pipelineIdFromUrl]);

  // When auth finishes loading and we need to default to first pipeline, push URL
  useEffect(() => {
    if (authLoading || pipelines.length === 0) return;
    if (!pipelineIdFromUrl || !pipelines.some((p) => p.id === pipelineIdFromUrl)) {
      if (pipelines[0]) {
        router.replace(`?pipelineId=${pipelines[0].id}`);
      }
    }
  }, [authLoading, pipelines, pipelineIdFromUrl, router]);

  function handlePipelineChange(newPipelineId: string) {
    router.push(`?pipelineId=${newPipelineId}`);
  }

  /* --- sensors --- */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Map: fromStageId -> Set of allowed toStageIds
  // If a stage has no outgoing transitions defined, all moves are allowed (backward compat)
  const allowedMoves = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const t of transitions) {
      if (!map.has(t.fromStageId)) map.set(t.fromStageId, new Set());
      map.get(t.fromStageId)!.add(t.toStageId);
    }
    return map;
  }, [transitions]);

  function canMoveTo(fromStageId: string, toStageId: string): boolean {
    if (fromStageId === toStageId) return false;
    const allowed = allowedMoves.get(fromStageId);
    if (!allowed) return true; // no transitions defined = unrestricted
    return allowed.has(toStageId);
  }

  // Which stages the currently dragged lead can move to
  const validDropStageIds = useMemo(() => {
    if (!activeLead) return new Set<string>();
    const fromId = leadsSnapshotRef.current.find((l) => l.id === activeLead.id)?.stageId ?? activeLead.stageId;
    const allowed = allowedMoves.get(fromId);
    if (!allowed) {
      // No transitions defined from this stage = all other stages are valid
      return new Set(stages.map((s) => s.id).filter((id) => id !== fromId));
    }
    return allowed;
  }, [activeLead, allowedMoves, stages]);

  /* --- data fetching (scoped to pipeline) --- */

  const fetchData = useCallback(async (pipelineId: string) => {
    if (!pipelineId) return;
    setLoading(true);
    setError(null);
    try {
      const [stagesRes, leadsRes, transRes] = await Promise.all([
        fetch(`/api/stages?pipelineId=${pipelineId}`),
        fetch(`/api/leads?pipelineId=${pipelineId}&limit=200`),
        fetch(`/api/stages/transitions?pipelineId=${pipelineId}`),
      ]);
      if (!stagesRes.ok || !leadsRes.ok || !transRes.ok) throw new Error("Failed to fetch data");
      const stagesData: Stage[] = await stagesRes.json();
      const leadsData = await leadsRes.json();
      const transData: Transition[] = await transRes.json();
      setStages(stagesData);
      setLeads(leadsData.leads ?? []);
      setTransitions(transData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch when selectedPipelineId changes
  useEffect(() => {
    if (selectedPipelineId) {
      fetchData(selectedPipelineId);
    }
  }, [selectedPipelineId, fetchData]);

  /* --- client-side filtering --- */

  const filteredLeads = useMemo(() => {
    let result = leads;

    // Search by name or phone
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q)
      );
    }

    // Source filter
    if (filters.source) {
      result = result.filter((l) => l.source === filters.source);
    }

    // Date range
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((l) => new Date(l.createdAt) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((l) => new Date(l.createdAt) <= to);
    }

    return result;
  }, [leads, filters]);

  /* group leads by stageId (using filtered leads for display) */
  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of stages) {
      map[stage.id] = [];
    }
    for (const lead of filteredLeads) {
      if (map[lead.stageId]) {
        map[lead.stageId].push(lead);
      }
    }
    return map;
  }, [stages, filteredLeads]);

  /* find which stage a lead is over (uses unfiltered leads for DnD) */
  function findStageIdForLead(leadId: string): string | undefined {
    return leads.find((l) => l.id === leadId)?.stageId;
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const lead = leads.find((l) => l.id === active.id);
    setActiveLead(lead ?? null);
    leadsSnapshotRef.current = leads.map((l) => ({ ...l }));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    const activeStageId = findStageIdForLead(activeLeadId);

    // Determine if we're over a lead card or a stage column
    let overStageId: string | undefined;

    // Check if overId is a stage
    if (stages.some((s) => s.id === overId)) {
      overStageId = overId;
    } else {
      // It's a lead; find which stage it belongs to
      overStageId = findStageIdForLead(overId);
    }

    if (!activeStageId || !overStageId || activeStageId === overStageId) return;

    // Block if transition not allowed
    const originalStageId = leadsSnapshotRef.current.find((l) => l.id === activeLeadId)?.stageId ?? activeStageId;
    if (!canMoveTo(originalStageId, overStageId)) return;

    // Move the lead to the new stage (optimistic)
    setLeads((prev) =>
      prev.map((l) =>
        l.id === activeLeadId ? { ...l, stageId: overStageId! } : l
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) {
      // No drop target -- revert to snapshot
      setLeads(leadsSnapshotRef.current);
      return;
    }

    const activeLeadId = active.id as string;
    const lead = leadsSnapshotRef.current.find((l) => l.id === activeLeadId);
    if (!lead) return;

    // Determine the target stage
    let targetStageId: string | undefined;
    if (stages.some((s) => s.id === (over.id as string))) {
      targetStageId = over.id as string;
    } else {
      targetStageId = leads.find((l) => l.id === (over.id as string))?.stageId;
    }

    if (!targetStageId) {
      setLeads(leadsSnapshotRef.current);
      return;
    }

    const originalStageId = lead.stageId;
    if (originalStageId === targetStageId) {
      setLeads(leadsSnapshotRef.current);
      return;
    }

    // Block if transition not allowed
    if (!canMoveTo(originalStageId, targetStageId)) {
      setLeads(leadsSnapshotRef.current);
      return;
    }

    // Revert the optimistic move before showing the dialog
    setLeads(leadsSnapshotRef.current);

    // Look up target stage details
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) return;

    // Show the stage transition dialog instead of calling API directly
    setPendingTransition({
      leadId: activeLeadId,
      leadName: lead.name,
      fromStageId: originalStageId,
      toStageId: targetStageId,
      toStageName: targetStage.name,
      toStageColor: targetStage.color,
    });
  }

  if (authLoading || (loading && pipelines.length === 0)) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Pipeline" description="Drag leads between stages" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header
          title="Pipeline"
          description="Drag leads between stages"
          actions={
            <div className="flex items-center gap-2">
              <PipelineSelector
                pipelines={pipelines}
                value={selectedPipelineId}
                onChange={handlePipelineChange}
              />
              <Button variant="outline" size="sm" onClick={() => fetchData(selectedPipelineId)}>
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          }
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchData(selectedPipelineId)}>
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
        title="Pipeline"
        description="Drag leads between stages"
        actions={
          <div className="flex items-center gap-2">
            <PipelineSelector
              pipelines={pipelines}
              value={selectedPipelineId}
              onChange={handlePipelineChange}
            />
            <Button variant="outline" size="sm" onClick={() => fetchData(selectedPipelineId)}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="px-4 pt-3 pb-1">
        <PipelineFilters filters={filters} onChange={setFilters} stages={stages.map(s => ({ id: s.id, name: s.name, color: s.color }))} />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full">
              {stages.filter((s) => !filters.hiddenStageIds.has(s.id)).map((stage) => {
                const dragging = !!activeLead;
                const sourceStageId = activeLead
                  ? leadsSnapshotRef.current.find((l) => l.id === activeLead.id)?.stageId ?? activeLead.stageId
                  : "";
                return (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    leads={leadsByStage[stage.id] ?? []}
                    isDragging={dragging}
                    isValidTarget={dragging && validDropStageIds.has(stage.id)}
                    isSource={dragging && stage.id === sourceStageId}
                  />
                );
              })}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeLead ? <LeadCardOverlay lead={activeLead} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {pendingTransition && (
        <StageTransitionDialog
          open={!!pendingTransition}
          onOpenChange={(open) => { if (!open) setPendingTransition(null); }}
          leadId={pendingTransition.leadId}
          leadName={pendingTransition.leadName}
          fromStageId={pendingTransition.fromStageId}
          toStageId={pendingTransition.toStageId}
          toStageName={pendingTransition.toStageName}
          toStageColor={pendingTransition.toStageColor}
          onSuccess={() => {
            setPendingTransition(null);
            fetchData(selectedPipelineId); // refresh all data
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </div>
  );
}
