"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";

/* ---------- types ---------- */

const FIELD_TYPES = [
  "text",
  "number",
  "date",
  "select",
  "textarea",
  "checkbox",
] as const;

type FieldType = (typeof FIELD_TYPES)[number];

interface StageField {
  id?: string;
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // only for "select" type
}

interface StageFieldManagerProps {
  stageId: string;
  stageName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ---------- component ---------- */

export function StageFieldManager({
  stageId,
  stageName,
  open,
  onOpenChange,
}: StageFieldManagerProps) {
  const [fields, setFields] = useState<StageField[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New field form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState("");

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stages/${stageId}/fields`);
      if (res.ok) {
        const data: StageField[] = await res.json();
        setFields(data);
      }
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    if (open) {
      fetchFields();
    }
  }, [open, fetchFields]);

  function handleToggleRequired(index: number) {
    setFields((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, required: !f.required } : f
      )
    );
  }

  function handleDeleteField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddField() {
    if (!newName.trim()) return;

    const field: StageField = {
      name: newName.trim(),
      type: newType,
      required: newRequired,
    };

    if (newType === "select" && newOptions.trim()) {
      field.options = newOptions
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
    }

    setFields((prev) => [...prev, field]);
    setNewName("");
    setNewType("text");
    setNewRequired(false);
    setNewOptions("");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/stages/${stageId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Fields for {stageName}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 space-y-4">
            {/* Existing fields */}
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No fields configured yet. Add one below.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={`${field.name}-${index}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                      {field.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {field.type}
                    </Badge>
                    {field.required && (
                      <Badge variant="outline" className="text-[10px] shrink-0 border-destructive text-destructive">
                        Required
                      </Badge>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={() => handleToggleRequired(index)}
                        aria-label="Toggle required"
                      />
                      <span className="text-xs text-muted-foreground">Req</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteField(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new field form */}
            <div className="rounded-md border border-dashed border-border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Add New Field
              </p>
              <div className="space-y-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Field name"
                  className="h-8 text-sm"
                />
                <Select
                  value={newType}
                  onValueChange={(v) => setNewType(v as FieldType)}
                >
                  <SelectTrigger className="h-8 text-sm w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newType === "select" && (
                  <Input
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                    placeholder="Options (comma-separated)"
                    className="h-8 text-sm"
                  />
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="new-field-required"
                    checked={newRequired}
                    onCheckedChange={(checked) =>
                      setNewRequired(checked === true)
                    }
                  />
                  <label
                    htmlFor="new-field-required"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Required
                  </label>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddField}
                disabled={!newName.trim()}
                className="w-full"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </Button>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Save Fields
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
