"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { StageFieldRenderer } from "./stage-field-renderer";
import type { StageField } from "@/types";

interface StageTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  fromStageId: string;
  toStageId: string;
  toStageName: string;
  toStageColor: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StageTransitionDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  fromStageId,
  toStageId,
  toStageName,
  toStageColor,
  onSuccess,
  onCancel,
}: StageTransitionDialogProps) {
  const [fields, setFields] = useState<StageField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/stages/${toStageId}/fields`);
      if (!res.ok) throw new Error("Failed to fetch fields");
      const data: StageField[] = await res.json();
      setFields(data);

      // Initialize default values
      const defaults: Record<string, string> = {};
      for (const f of data) {
        defaults[f.fieldKey] = f.fieldType === "checkbox" ? "false" : "";
      }
      setValues(defaults);
      setErrors({});

      // If no fields, auto-submit immediately
      if (data.length === 0) {
        await submitTransition({});
      }
    } catch {
      setApiError("Could not load stage fields");
    } finally {
      setLoading(false);
    }
  }, [toStageId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && toStageId) {
      fetchFields();
    }
  }, [open, toStageId, fetchFields]);

  async function submitTransition(fieldValues: Record<string, string>) {
    setSubmitting(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: toStageId, fieldValues }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.missingFields) {
          const fieldErrors: Record<string, string> = {};
          for (const mf of data.missingFields) {
            fieldErrors[mf.fieldKey] = "This field is required";
          }
          setErrors(fieldErrors);
          return;
        }
        throw new Error(data.error || "Failed to move lead");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    // Client-side validation
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required) {
        const val = values[field.fieldKey];
        if (!val || (field.fieldType !== "checkbox" && !val.trim())) {
          newErrors[field.fieldKey] = "This field is required";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    submitTransition(values);
  }

  function handleCancel() {
    onCancel();
    onOpenChange(false);
  }

  // Don't show dialog if no fields (auto-submit handles it)
  if (fields.length === 0 && !loading && !apiError) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Moving to
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: toStageColor }}
              />
              {toStageName}
            </span>
          </DialogTitle>
          <DialogDescription>
            Fill in the required fields for <span className="font-medium text-foreground">{leadName}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {fields.map((field) => (
              <StageFieldRenderer
                key={field.id}
                field={field}
                value={values[field.fieldKey] || ""}
                onChange={(v) => {
                  setValues((prev) => ({ ...prev, [field.fieldKey]: v }));
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next[field.fieldKey];
                    return next;
                  });
                }}
                error={errors[field.fieldKey]}
              />
            ))}
          </div>
        )}

        {apiError && (
          <p className="text-sm text-destructive">{apiError}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Confirm Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
