"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface MetaForm {
  id: string;
  name: string;
  status: string;
  mappedPipelineId?: string | null;
}

interface FormPickerProps {
  selectedFormIds: string[];
  onChange: (formIds: string[], formNames?: Record<string, string>) => void;
  /** Pipeline names by ID — used to show which pipeline a form is already assigned to */
  pipelineNames?: Record<string, string>;
}

export function FormPicker({ selectedFormIds, onChange, pipelineNames = {} }: FormPickerProps) {
  const [forms, setForms] = useState<MetaForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Check if Meta is connected
        const connRes = await fetch("/api/meta/connection");
        if (connRes.ok) {
          const d = await connRes.json();
          if (!d.success || !d.data.isConnected) {
            setConnected(false);
            return;
          }
          setConnected(true);
        }

        const formsRes = await fetch("/api/meta/forms");
        if (formsRes.ok) {
          const d = await formsRes.json();
          setForms(d.success ? (d.data.forms || d.data) : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />Loading forms...
      </div>
    );
  }

  if (!connected) {
    return (
      <p className="text-xs text-muted-foreground py-1">
        Connect your Meta page in Integrations to link forms.
      </p>
    );
  }

  if (forms.length === 0) {
    return <p className="text-xs text-muted-foreground py-1">No lead gen forms found.</p>;
  }

  // Build formId→name map for all forms
  const formNameMap = Object.fromEntries(forms.map((f) => [f.id, f.name]));

  function toggle(formId: string) {
    const newIds = selectedFormIds.includes(formId)
      ? selectedFormIds.filter((id) => id !== formId)
      : [...selectedFormIds, formId];
    // Pass form names for all selected forms
    const names: Record<string, string> = {};
    for (const id of newIds) { if (formNameMap[id]) names[id] = formNameMap[id]; }
    onChange(newIds, names);
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {forms.map((form) => {
        const assignedTo = form.mappedPipelineId ? pipelineNames[form.mappedPipelineId] : null;
        const isSelected = selectedFormIds.includes(form.id);
        const isAssignedElsewhere = !!assignedTo && !isSelected;

        return (
          <label
            key={form.id}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
              isSelected
                ? "border-primary/30 bg-primary/5"
                : isAssignedElsewhere
                  ? "border-border opacity-60"
                  : "border-border hover:bg-accent"
            }`}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggle(form.id)}
              disabled={isAssignedElsewhere}
            />
            <span className="text-xs font-medium flex-1 truncate">{form.name}</span>
            {isAssignedElsewhere && (
              <Badge variant="outline" className="text-[9px] shrink-0">{assignedTo}</Badge>
            )}
          </label>
        );
      })}
    </div>
  );
}
