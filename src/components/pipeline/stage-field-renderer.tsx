"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { StageField } from "@/types";

interface StageFieldRendererProps {
  field: StageField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function StageFieldRenderer({ field, value, onChange, error }: StageFieldRendererProps) {
  const parsedOptions: string[] = field.options ? JSON.parse(field.options) : [];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {field.name}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {field.fieldType === "text" && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.name.toLowerCase()}`}
        />
      )}

      {field.fieldType === "number" && (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.name.toLowerCase()}`}
        />
      )}

      {field.fieldType === "textarea" && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.name.toLowerCase()}`}
          rows={3}
        />
      )}

      {field.fieldType === "select" && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {parsedOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.fieldType === "date" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(parseISO(value), "PPP") : <span className="text-muted-foreground">Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={value ? parseISO(value) : undefined}
              onSelect={(date) => onChange(date ? date.toISOString() : "")}
            />
          </PopoverContent>
        </Popover>
      )}

      {field.fieldType === "checkbox" && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={field.fieldKey}
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          />
          <label htmlFor={field.fieldKey} className="text-sm text-foreground cursor-pointer">
            {field.name}
          </label>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
