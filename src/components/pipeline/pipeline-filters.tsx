"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { X, SlidersHorizontal } from "lucide-react";

interface StageOption {
  id: string;
  name: string;
  color: string;
}

export interface PipelineFilterValues {
  search: string;
  source: string;
  dateFrom: string;
  dateTo: string;
  hiddenStageIds: Set<string>;
}

const EMPTY_FILTERS: PipelineFilterValues = {
  search: "",
  source: "",
  dateFrom: "",
  dateTo: "",
  hiddenStageIds: new Set(),
};

interface PipelineFiltersProps {
  filters: PipelineFilterValues;
  onChange: (filters: PipelineFilterValues) => void;
  stages?: StageOption[];
}

export function PipelineFilters({ filters, onChange, stages = [] }: PipelineFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.source || filters.dateFrom || filters.dateTo || filters.hiddenStageIds.size > 0;

  const visibleCount = stages.length - filters.hiddenStageIds.size;

  function toggleStage(stageId: string) {
    const next = new Set(filters.hiddenStageIds);
    if (next.has(stageId)) {
      next.delete(stageId);
    } else {
      next.add(stageId);
    }
    onChange({ ...filters, hiddenStageIds: next });
  }

  function showAllStages() {
    onChange({ ...filters, hiddenStageIds: new Set() });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        placeholder="Search leads..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-[180px] h-8 text-sm"
      />
      <Select
        value={filters.source || "all"}
        onValueChange={(v) => onChange({ ...filters, source: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="meta_ads">Meta Ads</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
          <SelectItem value="website">Website</SelectItem>
          <SelectItem value="referral">Referral</SelectItem>
        </SelectContent>
      </Select>

      {stages.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-sm gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Stages
              {filters.hiddenStageIds.size > 0 && (
                <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0 ml-0.5">
                  {visibleCount}/{stages.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 pb-1.5 border-b border-border mb-1">
                <span className="text-xs font-medium text-muted-foreground">Show/Hide Stages</span>
                {filters.hiddenStageIds.size > 0 && (
                  <button
                    onClick={showAllStages}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Show all
                  </button>
                )}
              </div>
              {stages.map((stage) => (
                <label
                  key={stage.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={!filters.hiddenStageIds.has(stage.id)}
                    onCheckedChange={() => toggleStage(stage.id)}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm truncate">{stage.name}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        className="w-[140px] h-8 text-sm"
        placeholder="From"
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        className="w-[140px] h-8 text-sm"
        placeholder="To"
      />
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

export { EMPTY_FILTERS };
