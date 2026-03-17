"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { LeadForm } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PipelineSelector } from "@/components/pipeline/pipeline-selector";

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  createdAt: string;
  stage: {
    id: string;
    name: string;
    color: string;
    order: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "manual", label: "Manual" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
];

const SOURCE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  manual: "Manual",
  website: "Website",
  referral: "Referral",
};

export default function LeadsPageWrapper() {
  return <Suspense><LeadsPageInner /></Suspense>;
}

function LeadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pipelines } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Pipeline selection — persisted in URL
  const selectedPipelineId =
    searchParams.get("pipelineId") || pipelines[0]?.id || "";

  const setSelectedPipelineId = useCallback(
    (pipelineId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pipelineId", pipelineId);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [stageFilter, sourceFilter, dateFrom, dateTo]);

  // Reset stage filter when pipeline changes (old stage may not exist in new pipeline)
  useEffect(() => {
    setStageFilter("all");
    setPage(1);
  }, [selectedPipelineId]);

  // Fetch stages scoped to the selected pipeline
  useEffect(() => {
    if (!selectedPipelineId) return;
    const params = new URLSearchParams();
    params.set("pipelineId", selectedPipelineId);
    fetch(`/api/stages?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setStages(data))
      .catch(console.error);
  }, [selectedPipelineId]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!selectedPipelineId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("pipelineId", selectedPipelineId);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (stageFilter !== "all") params.set("stageId", stageFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPipelineId, page, debouncedSearch, stageFilter, sourceFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Leads"
        description={`${pagination.total} total lead${pagination.total !== 1 ? "s" : ""}`}
        actions={
          <div className="flex items-center gap-3">
            <PipelineSelector
              pipelines={pipelines}
              value={selectedPipelineId}
              onChange={setSelectedPipelineId}
            />
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Lead
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="px-8 py-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px] text-xs"
            placeholder="From"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px] text-xs"
            placeholder="To"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No leads found.</p>
            <p className="text-xs mt-1">
              Try adjusting your filters or add a new lead.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-8">Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <TableCell className="pl-8 font-medium">
                    {lead.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.email || "--"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[lead.source] || lead.source}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium"
                      style={{
                        backgroundColor: `${lead.stage?.color}20`,
                        color: lead.stage?.color,
                        borderColor: `${lead.stage?.color}30`,
                      }}
                    >
                      {lead.stage?.name || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(lead.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-8 py-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Lead Form */}
      <LeadForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
