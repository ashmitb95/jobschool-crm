"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { LeadForm } from "@/components/leads/lead-form";
import { KanbanView } from "@/components/leads/kanban-view";
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
  Upload,
  List,
  Kanban,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { PipelineSelector } from "@/components/pipeline/pipeline-selector";
import { CSVImportDialog } from "@/components/leads/csv-import-dialog";

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
  owner: { id: string; displayName: string } | null;
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
  const { user, pipelines } = useAuth();
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
  const [importOpen, setImportOpen] = useState(false);

  // Bulk selection + actions (admin only)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [orgUsers, setOrgUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  // View toggle: list or board (kanban)
  const viewFromUrl = searchParams.get("view") as "list" | "board" | null;
  const view = viewFromUrl === "board" ? "board" : "list";

  function setView(v: "list" | "board") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`?${params.toString()}`);
  }

  // Fetch org users for assign dropdown (admin only)
  useEffect(() => {
    if (user?.role !== "admin") return;
    fetch("/api/admin/users").then(async (res) => {
      if (res.ok) {
        const d = await res.json();
        const list = d.success ? d.data : d;
        setOrgUsers(Array.isArray(list) ? list.map((u: { id: string; displayName: string }) => ({ id: u.id, displayName: u.displayName })) : []);
      }
    }).catch(() => {});
  }, [user?.role]);

  async function handleBulkAssign(ownerId: string) {
    setBulkAssigning(true);
    try {
      const res = await fetch("/api/leads/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: [...selectedLeadIds], ownerId }),
      });
      if ((await res.json()).success) {
        toast.success(`Assigned ${selectedLeadIds.size} leads`);
        setSelectedLeadIds(new Set());
        fetchLeads();
      }
    } finally {
      setBulkAssigning(false);
    }
  }

  async function handleDeleteLead(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Lead deleted");
      fetchLeads();
    } else {
      toast.error("Failed to delete lead");
    }
  }

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

  // Filters (list view only)
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Clear selection when pipeline or page changes
  useEffect(() => { setSelectedLeadIds(new Set()); }, [selectedPipelineId, page]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [stageFilter, sourceFilter, dateFrom, dateTo]);
  useEffect(() => { setStageFilter("all"); setPage(1); }, [selectedPipelineId]);

  // Fetch stages
  useEffect(() => {
    if (!selectedPipelineId) return;
    fetch(`/api/stages?pipelineId=${selectedPipelineId}`)
      .then((res) => res.json())
      .then((data) => setStages(data))
      .catch(console.error);
  }, [selectedPipelineId]);

  // Fetch leads (list view)
  const fetchLeads = useCallback(async () => {
    if (!selectedPipelineId || view === "board") return;
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
  }, [selectedPipelineId, page, debouncedSearch, stageFilter, sourceFilter, dateFrom, dateTo, view]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch { return dateStr; }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Leads"
        description={view === "list" ? `${pagination.total} total lead${pagination.total !== 1 ? "s" : ""}` : "Drag leads between stages"}
        actions={
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={`p-1.5 transition-colors ${view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("board")}
                className={`p-1.5 transition-colors ${view === "board" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                title="Board view"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>

            <PipelineSelector
              pipelines={pipelines}
              value={selectedPipelineId}
              onChange={setSelectedPipelineId}
            />
            {user?.role === "admin" && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4" />
                Import CSV
              </Button>
            )}
            {user?.role === "admin" && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Lead
              </Button>
            )}
          </div>
        }
      />

      {view === "board" ? (
        /* ── Kanban View ── */
        <KanbanView pipelineId={selectedPipelineId} />
      ) : (
        /* ── List View ── */
        <>
          {/* Filter Bar */}
          <div className="px-4 sm:px-8 py-3 sm:py-4 border-b border-border flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: stage.color }} />
                        {stage.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden sm:flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px] text-xs" />
              <span className="text-muted-foreground text-xs">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px] text-xs" />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Users className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No leads found.</p>
                <p className="text-xs mt-1">Try adjusting your filters or add a new lead.</p>
              </div>
            ) : (
              <>
              {/* Bulk assign bar */}
              {user?.role === "admin" && selectedLeadIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 sm:px-8 py-2 bg-primary/5 border-b border-primary/20">
                  <span className="text-xs font-medium">{selectedLeadIds.size} selected</span>
                  <Select onValueChange={handleBulkAssign} disabled={bulkAssigning}>
                    <SelectTrigger className="w-44 h-7 text-xs">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orgUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelectedLeadIds(new Set())}>
                    Clear
                  </button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    {user?.role === "admin" && (
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedLeadIds(new Set(leads.map((l) => l.id)));
                            else setSelectedLeadIds(new Set());
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Source</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    {user?.role === "admin" && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                      {user?.role === "admin" && (
                        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedLeadIds.has(lead.id)}
                            onCheckedChange={(checked) => {
                              setSelectedLeadIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(lead.id);
                                else next.delete(lead.id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{lead.email || "--"}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{SOURCE_LABELS[lead.source] || lead.source}</span>
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
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{lead.owner?.displayName || "Unassigned"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">{formatDate(lead.createdAt)}</TableCell>
                      {user?.role === "admin" && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            onClick={() => setDeleteLeadId(lead.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="w-4 h-4" />Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">Page {pagination.page} of {pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next<ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Lead Form */}
      <LeadForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchLeads} />

      {/* CSV Import */}
      <CSVImportDialog open={importOpen} onOpenChange={setImportOpen} pipelines={pipelines} onImported={fetchLeads} />

      {/* Delete Lead Confirm */}
      <ConfirmDialog
        open={!!deleteLeadId}
        onOpenChange={(open) => { if (!open) setDeleteLeadId(null); }}
        title="Delete Lead"
        description="This lead will be archived and no longer visible. This action can be reversed by a super admin."
        actionLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deleteLeadId) handleDeleteLead(deleteLeadId); }}
      />
    </div>
  );
}
