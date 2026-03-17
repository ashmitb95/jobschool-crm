"use client";

import { Handle, Position } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, FileText } from "lucide-react";

interface StageNodeData {
  name: string;
  color: string;
  templateName: string | null;
  fieldCount: number;
  isDefault: boolean;
}

export function StageNode({ data }: { data: StageNodeData }) {
  return (
    <Card className="w-[220px] border-l-4 shadow-md cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all" style={{ borderLeftColor: data.color }}>
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2.5 !h-2.5" />
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
          <CardTitle className="text-sm truncate">{data.name}</CardTitle>
          {data.isDefault && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">Default</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare className="w-3 h-3 shrink-0" />
          <span className="truncate">{data.templateName || "No template"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="w-3 h-3 shrink-0" />
          {data.fieldCount} field{data.fieldCount !== 1 ? "s" : ""}
        </div>
      </CardContent>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2.5 !h-2.5" />
    </Card>
  );
}
