"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  inputLabel: string;
  inputType?: string;
  placeholder?: string;
  actionLabel?: string;
  validate?: (value: string) => string | null;
  onConfirm: (value: string) => void;
}

export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  inputLabel,
  inputType = "text",
  placeholder,
  actionLabel = "Confirm",
  validate,
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (validate) {
      const err = validate(value);
      if (err) {
        setError(err);
        return;
      }
    }
    onConfirm(value);
    setValue("");
    setError(null);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setValue("");
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <Label>{inputLabel}</Label>
          <Input
            type={inputType}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>{actionLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
