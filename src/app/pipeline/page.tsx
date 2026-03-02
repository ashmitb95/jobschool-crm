"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
}: {
  stage: Stage;
  leads: Lead[];
}) {
  const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);

  return (
    <div className="flex flex-col w-[272px] shrink-0 h-full">
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
      <div className="flex-1 overflow-y-auto rounded-lg bg-muted/40 p-2 space-y-1.5 min-h-[120px]">
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

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        fetch("/api/stages"),
        fetch("/api/leads?limit=200"),
      ]);
      if (!stagesRes.ok || !leadsRes.ok) throw new Error("Failed to fetch data");
      const stagesData: Stage[] = await stagesRes.json();
      const leadsData = await leadsRes.json();
      setStages(stagesData);
      setLeads(leadsData.leads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* group leads by stageId */
  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of stages) {
      map[stage.id] = [];
    }
    for (const lead of leads) {
      if (map[lead.stageId]) {
        map[lead.stageId].push(lead);
      }
    }
    return map;
  }, [stages, leads]);

  /* find which stage a lead is over */
  function findStageIdForLead(leadId: string): string | undefined {
    return leads.find((l) => l.id === leadId)?.stageId;
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const lead = leads.find((l) => l.id === active.id);
    setActiveLead(lead ?? null);
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

    // Move the lead to the new stage (optimistic)
    setLeads((prev) =>
      prev.map((l) =>
        l.id === activeLeadId ? { ...l, stageId: overStageId! } : l
      )
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const activeLeadId = active.id as string;
    const lead = leads.find((l) => l.id === activeLeadId);
    if (!lead) return;

    // Determine the target stage
    let targetStageId: string | undefined;
    if (stages.some((s) => s.id === (over.id as string))) {
      targetStageId = over.id as string;
    } else {
      targetStageId = leads.find((l) => l.id === (over.id as string))?.stageId;
    }

    if (!targetStageId) return;

    // We already moved optimistically in handleDragOver, but ensure consistency
    const originalStageId = active.data?.current?.lead?.stageId;
    if (originalStageId && originalStageId !== targetStageId) {
      try {
        const res = await fetch(`/api/leads/${activeLeadId}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageId: targetStageId }),
        });
        if (!res.ok) {
          // Revert on failure
          setLeads((prev) =>
            prev.map((l) =>
              l.id === activeLeadId ? { ...l, stageId: originalStageId } : l
            )
          );
        }
      } catch {
        // Revert on error
        setLeads((prev) =>
          prev.map((l) =>
            l.id === activeLeadId ? { ...l, stageId: originalStageId } : l
          )
        );
      }
    }
  }

  if (loading) {
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
        <Header title="Pipeline" description="Drag leads between stages" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>
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
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                leads={leadsByStage[stage.id] ?? []}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeLead ? <LeadCardOverlay lead={activeLead} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
