"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { StageNode } from "@/components/workflow/stage-node";
import { StageConfigSidebar } from "@/components/workflow/stage-config-sidebar";
import { PipelineSelector } from "@/components/pipeline/pipeline-selector";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Save, Plus, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/* ---------- types ---------- */

interface WorkflowStage {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  templateName: string | null;
  fieldCount: number;
  workflowX: number | null;
  workflowY: number | null;
}

interface WorkflowTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
}

interface WorkflowData {
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
}

/* ---------- node types ---------- */

const nodeTypes = { stageNode: StageNode };

/* ---------- page ---------- */

export default function WorkflowPage() {
  const { user, pipelines, refresh } = useAuth();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newPipelineDesc, setNewPipelineDesc] = useState("");
  const [creatingPipeline, setCreatingPipeline] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingStage, setAddingStage] = useState(false);

  // Default to first pipeline
  useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  // Sidebar state
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchWorkflow = useCallback(async () => {
    if (!selectedPipelineId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workflow?pipelineId=${selectedPipelineId}`);
      if (!res.ok) throw new Error("Failed to fetch workflow");
      const data: WorkflowData = await res.json();

      const mappedNodes: Node[] = data.stages.map((stage, index) => ({
        id: stage.id,
        type: "stageNode",
        position: {
          x: stage.workflowX ?? index * 300,
          y: stage.workflowY ?? 100,
        },
        data: {
          name: stage.name,
          color: stage.color,
          templateName: stage.templateName,
          fieldCount: stage.fieldCount,
          isDefault: stage.isDefault,
        },
      }));

      const mappedEdges: Edge[] = data.transitions.map((t) => ({
        id: t.id,
        source: t.fromStageId,
        target: t.toStageId,
        type: "bezier",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      }));

      setNodes(mappedNodes);
      setEdges(mappedEdges);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load workflow"
      );
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges, selectedPipelineId]);

  useEffect(() => {
    if (selectedPipelineId) {
      fetchWorkflow();
    }
  }, [fetchWorkflow]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "bezier",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      setEdges((eds) =>
        eds.filter((e) => !deletedEdges.some((de) => de.id === e.id))
      );
    },
    [setEdges]
  );

  // Click a node to open config sidebar
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedStageId(node.id);
    setSidebarOpen(true);
  }, []);

  // Add a new stage
  async function handleAddStage() {
    setAddingStage(true);
    try {
      const res = await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Stage", color: "#6b7280", pipelineId: selectedPipelineId }),
      });
      if (!res.ok) throw new Error("Failed to create stage");
      const data = await res.json();

      // Compute position: to the right of the rightmost node
      const maxX = nodes.length > 0
        ? Math.max(...nodes.map((n) => n.position.x))
        : -300;

      const newNode: Node = {
        id: data.id,
        type: "stageNode",
        position: { x: maxX + 350, y: 100 },
        data: {
          name: data.name,
          color: data.color,
          templateName: null,
          fieldCount: 1, // default Notes field
          isDefault: false,
        },
      };

      setNodes((prev) => [...prev, newNode]);

      // Open sidebar for the new stage
      setSelectedStageId(data.id);
      setSidebarOpen(true);

      toast.success("Stage created — configure it in the sidebar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create stage");
    } finally {
      setAddingStage(false);
    }
  }

  // After sidebar save or delete, refetch to sync
  function handleSidebarSaved() {
    setSidebarOpen(false);
    fetchWorkflow();
  }

  function handleSidebarDeleted() {
    setSidebarOpen(false);
    setSelectedStageId(null);
    fetchWorkflow();
  }

  async function handleCreatePipeline() {
    if (!newPipelineName.trim()) return;
    setCreatingPipeline(true);
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPipelineName, description: newPipelineDesc || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error?.message || "Failed to create pipeline");
        return;
      }
      const d = await res.json();
      const newId = d.data?.id || d.id;
      toast.success("Pipeline created");
      setShowCreatePipeline(false);
      setNewPipelineName("");
      setNewPipelineDesc("");
      await refresh(); // refresh auth context to get new pipeline
      setSelectedPipelineId(newId);
    } catch {
      toast.error("Failed to create pipeline");
    } finally {
      setCreatingPipeline(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const transitionPayload = edges.map((e) => ({
        fromStageId: e.source,
        toStageId: e.target,
      }));

      const transRes = await fetch("/api/stages/transitions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transitions: transitionPayload, pipelineId: selectedPipelineId }),
      });

      if (!transRes.ok) throw new Error("Failed to save transitions");

      const positionPayload = nodes.map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
      }));

      const posRes = await fetch("/api/workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: positionPayload }),
      });

      if (!posRes.ok) throw new Error("Failed to save positions");

      toast.success("Workflow saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save workflow"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Workflow" description="Visual pipeline workflow builder" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Workflow"
        description="Click a stage to configure it. Drag between handles to connect."
        actions={
          <div className="flex items-center gap-2">
            <PipelineSelector
              pipelines={pipelines}
              value={selectedPipelineId}
              onChange={setSelectedPipelineId}
            />
            {user?.role === "admin" && (
              <Sheet open={showCreatePipeline} onOpenChange={setShowCreatePipeline}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <PlusCircle className="w-4 h-4" />
                    New Pipeline
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader><SheetTitle>Create Pipeline</SheetTitle></SheetHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Name</label>
                      <Input value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)} placeholder="e.g. Sales Pipeline" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Input value={newPipelineDesc} onChange={(e) => setNewPipelineDesc(e.target.value)} placeholder="Optional description" />
                    </div>
                    <Button onClick={handleCreatePipeline} disabled={creatingPipeline || !newPipelineName.trim()} className="w-full">
                      {creatingPipeline && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Create Pipeline
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStage}
              disabled={addingStage}
            >
              {addingStage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Stage
            </Button>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </Button>
          </div>
        }
      />
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: "var(--background)" }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color="var(--muted-foreground)"
            gap={20}
            size={1}
            style={{ opacity: 0.15 }}
          />
          <Controls className="!bg-card !border-border !shadow-lg" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor={(n) => (n.data?.color as string) || "#6b7280"}
          />
        </ReactFlow>
      </div>

      {/* Stage config sidebar */}
      <StageConfigSidebar
        stageId={selectedStageId}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onSaved={handleSidebarSaved}
        onDeleted={handleSidebarDeleted}
      />
    </div>
  );
}
