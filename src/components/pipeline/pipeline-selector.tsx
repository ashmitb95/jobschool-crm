"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Pipeline } from "@/types";

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  value: string;
  onChange: (pipelineId: string) => void;
  className?: string;
}

export function PipelineSelector({
  pipelines,
  value,
  onChange,
  className,
}: PipelineSelectorProps) {
  if (pipelines.length === 0) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[200px]"}>
        <SelectValue placeholder="Select pipeline" />
      </SelectTrigger>
      <SelectContent>
        {pipelines.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
