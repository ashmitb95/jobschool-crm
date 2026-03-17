"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface StageGroup {
  stageName: string;
  stageColor: string;
  stageId: string;
  fields: Array<{
    fieldName: string;
    fieldKey: string;
    fieldType: string;
    value: string | null;
  }>;
}

export function LeadStageData({ leadId }: { leadId: string }) {
  const [data, setData] = useState<StageGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leads/${leadId}/stage-data`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading || data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Stage Data</h3>
      {data.map((group) => (
        <div key={group.stageId} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.stageColor }} />
            <span className="text-xs font-medium text-muted-foreground">{group.stageName}</span>
          </div>
          <div className="pl-4 space-y-1">
            {group.fields.map((f) => (
              <div key={f.fieldKey} className="flex items-baseline gap-2 text-sm">
                <span className="text-xs text-muted-foreground shrink-0">{f.fieldName}:</span>
                <span className="text-foreground">
                  {f.fieldType === "checkbox" ? (f.value === "true" ? "Yes" : "No") : f.value || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
