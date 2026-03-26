"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Phone, GripVertical, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StageTransitionDialog } from "@/components/pipeline/stage-transition-dialog";

/* ---------- types ---------- */

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
  templateId: string | null;
  isDefault: boolean;
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { type: "lead", lead } });

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
        <p className="text-sm font-medium text-foreground truncate leading-tight">{lead.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{lead.phone}</span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 h-4 leading-none ${sourceColors[lead.source] || "bg-muted text-muted-foreground"}`}
          >
            {sourceLabels[lead.source] || lead.source}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
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
        <p className="text-sm font-medium text-foreground truncate leading-tight">{lead.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{lead.phone}</span>
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
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
}: {
  stage: Stage;
  leads: Lead[];
  isDragging: boolean;
  isValidTarget: boolean;
  isSource: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
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
      <div className="flex items-center gap-1.5 px-2 py-2.5 mb-2 group/header">
        <button
          onClick={onMoveLeft}
          disabled={!canMoveLeft}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-0 opacity-0 group-hover/header:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        <h3 className="text-sm font-semibold text-foreground truncate flex-1">{stage.name}</h3>
        <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {leads.length}
        </span>
        <button
          onClick={onMoveRight}
          disabled={!canMoveRight}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-0 opacity-0 group-hover/header:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className={dropZoneClass}>
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">No leads</div>
        )}
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

interface KanbanViewProps {
  pipelineId: string;
}

export function KanbanView({ pipelineId }: KanbanViewProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{
    leadId: string;
    leadName: string;
    fromStageId: string;
    toStageId: string;
    toStageName: string;
    toStageColor: string;
  } | null>(null);
  const leadsSnapshotRef = useRef<Lead[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
    if (!allowed) return true;
    return allowed.has(toStageId);
  }

  const validDropStageIds = useMemo(() => {
    if (!activeLead) return new Set<string>();
    const fromId = leadsSnapshotRef.current.find((l) => l.id === activeLead.id)?.stageId ?? activeLead.stageId;
    const allowed = allowedMoves.get(fromId);
    if (!allowed) return new Set(stages.map((s) => s.id).filter((id) => id !== fromId));
    return allowed;
  }, [activeLead, allowedMoves, stages]);

  const fetchData = useCallback(async () => {
    if (!pipelineId) return;
    setLoading(true);
    try {
      const [stagesRes, leadsRes, transRes] = await Promise.all([
        fetch(`/api/stages?pipelineId=${pipelineId}`),
        fetch(`/api/leads?pipelineId=${pipelineId}&limit=200`),
        fetch(`/api/stages/transitions?pipelineId=${pipelineId}`),
      ]);
      if (!stagesRes.ok || !leadsRes.ok || !transRes.ok) throw new Error("Failed to fetch data");
      setStages(await stagesRes.json());
      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads ?? []);
      setTransitions(await transRes.json());
    } catch {
      // Errors handled by parent
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of stages) map[stage.id] = [];
    for (const lead of leads) {
      if (map[lead.stageId]) map[lead.stageId].push(lead);
    }
    return map;
  }, [stages, leads]);

  function findStageIdForLead(leadId: string) {
    return leads.find((l) => l.id === leadId)?.stageId;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(leads.find((l) => l.id === event.active.id) ?? null);
    leadsSnapshotRef.current = leads.map((l) => ({ ...l }));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeLeadId = active.id as string;
    const overId = over.id as string;
    const activeStageId = findStageIdForLead(activeLeadId);
    let overStageId = stages.some((s) => s.id === overId) ? overId : findStageIdForLead(overId);
    if (!activeStageId || !overStageId || activeStageId === overStageId) return;
    const originalStageId = leadsSnapshotRef.current.find((l) => l.id === activeLeadId)?.stageId ?? activeStageId;
    if (!canMoveTo(originalStageId, overStageId)) return;
    setLeads((prev) => prev.map((l) => l.id === activeLeadId ? { ...l, stageId: overStageId! } : l));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) { setLeads(leadsSnapshotRef.current); return; }
    const activeLeadId = active.id as string;
    const lead = leadsSnapshotRef.current.find((l) => l.id === activeLeadId);
    if (!lead) return;
    let targetStageId = stages.some((s) => s.id === (over.id as string))
      ? (over.id as string)
      : leads.find((l) => l.id === (over.id as string))?.stageId;
    if (!targetStageId) { setLeads(leadsSnapshotRef.current); return; }
    const originalStageId = lead.stageId;
    if (originalStageId === targetStageId || !canMoveTo(originalStageId, targetStageId)) {
      setLeads(leadsSnapshotRef.current);
      return;
    }
    setLeads(leadsSnapshotRef.current);
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) return;
    setPendingTransition({
      leadId: activeLeadId,
      leadName: lead.name,
      fromStageId: originalStageId,
      toStageId: targetStageId,
      toStageName: targetStage.name,
      toStageColor: targetStage.color,
    });
  }

  // Stage reordering
  async function handleReorderStage(stageId: string, direction: "left" | "right") {
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === stageId);
    if (idx < 0) return;
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    // Swap orders
    const newStages = [...sorted];
    const tmpOrder = newStages[idx].order;
    newStages[idx] = { ...newStages[idx], order: newStages[swapIdx].order };
    newStages[swapIdx] = { ...newStages[swapIdx], order: tmpOrder };
    setStages(newStages);

    // Persist
    await fetch("/api/stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stages: newStages.map((s) => ({ id: s.id, order: s.order })),
      }),
    });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {[...stages].sort((a, b) => a.order - b.order).map((stage, idx) => {
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
                  canMoveLeft={idx > 0}
                  canMoveRight={idx < stages.length - 1}
                  onMoveLeft={() => handleReorderStage(stage.id, "left")}
                  onMoveRight={() => handleReorderStage(stage.id, "right")}
                />
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeLead ? <LeadCardOverlay lead={activeLead} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

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
          onSuccess={() => { setPendingTransition(null); fetchData(); }}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </>
  );
}
