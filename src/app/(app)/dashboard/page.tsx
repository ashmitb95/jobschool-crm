"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  UserPlus,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  UserX,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { PipelineSelector } from "@/components/pipeline/pipeline-selector";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  summary: {
    totalLeads: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    messagesSent: number;
    conversionRate: number;
    staleLeads: number;
    unassignedLeads: number;
  };
  stageBreakdown: { stageId: string; stageName: string; stageColor: string; stageOrder: number; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  ownerBreakdown: { ownerId: string | null; ownerName: string | null; count: number }[];
  dailyInflow: { date: string; count: number }[];
  recentActivity: { id: string; action: string; description: string; createdAt: string; leadId: string; userName: string | null }[];
  bdStageMatrix: { ownerId: string | null; ownerName: string | null; stageId: string; stageName: string; stageOrder: number; count: number }[];
}

const SOURCE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  manual: "Manual",
  website: "Website",
  referral: "Referral",
};

const SOURCE_COLORS: Record<string, string> = {
  meta_ads: "#4a8fd4",
  manual: "#6b7280",
  website: "#3a9e6e",
  referral: "#c49a3c",
};

export default function DashboardPage() {
  const { user, pipelines } = useAuth();
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  const fetchDashboard = useCallback(async () => {
    if (!selectedPipelineId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?pipelineId=${selectedPipelineId}`);
      const d = await res.json();
      if (d.success) setData(d.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedPipelineId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const isAdmin = user?.role === "admin";

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full">
        <Header
          title="Dashboard"
          description="Overview of your pipeline"
          actions={<PipelineSelector pipelines={pipelines} value={selectedPipelineId} onChange={setSelectedPipelineId} />}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const { summary, stageBreakdown, sourceBreakdown, ownerBreakdown, dailyInflow, recentActivity, bdStageMatrix } = data;
  const maxStageCount = Math.max(...stageBreakdown.map((s) => s.count), 1);
  const maxDailyCount = Math.max(...dailyInflow.map((d) => d.count), 1);

  // Build BD x Stage matrix
  const bdNames = [...new Map(bdStageMatrix.map((r) => [r.ownerId || "unassigned", r.ownerName || "Unassigned"])).entries()];
  const matrixStages = [...new Map(stageBreakdown.map((s) => [s.stageId, { name: s.stageName, order: s.stageOrder, color: s.stageColor }])).entries()]
    .sort((a, b) => a[1].order - b[1].order);
  const matrixData = new Map<string, Map<string, number>>();
  for (const r of bdStageMatrix) {
    const key = r.ownerId || "unassigned";
    if (!matrixData.has(key)) matrixData.set(key, new Map());
    matrixData.get(key)!.set(r.stageId, r.count);
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Dashboard"
        description="Pipeline performance at a glance"
        actions={<PipelineSelector pipelines={pipelines} value={selectedPipelineId} onChange={setSelectedPipelineId} />}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── Row 1: Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Leads", value: summary.totalLeads, icon: Users, color: "#e8622a" },
              { label: "New This Week", value: summary.newThisWeek, icon: UserPlus, color: "#3a9e6e" },
              { label: "Messages Sent", value: summary.messagesSent, icon: MessageSquare, color: "#4a8fd4" },
              { label: "Conversion Rate", value: `${summary.conversionRate}%`, icon: TrendingUp, color: "#c49a3c" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Row 2: Alerts ── */}
          {isAdmin && (summary.staleLeads > 0 || summary.unassignedLeads > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.unassignedLeads > 0 && (
                <Link href="/leads">
                  <Card className="border-amber-500/30 hover:border-amber-500/50 transition-colors cursor-pointer">
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10"><UserX className="w-4 h-4 text-amber-500" /></div>
                        <div>
                          <p className="text-sm font-medium">{summary.unassignedLeads} unassigned lead{summary.unassignedLeads !== 1 ? "s" : ""}</p>
                          <p className="text-xs text-muted-foreground">Need to be assigned to a BD</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
              {summary.staleLeads > 0 && (
                <Card className="border-red-500/30">
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10"><Clock className="w-4 h-4 text-red-500" /></div>
                      <div>
                        <p className="text-sm font-medium">{summary.staleLeads} stale lead{summary.staleLeads !== 1 ? "s" : ""}</p>
                        <p className="text-xs text-muted-foreground">Not updated in 3+ days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Row 3: Pipeline Funnel + Lead Inflow ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline Funnel */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Pipeline Funnel</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {stageBreakdown.map((stage, i) => {
                  const prevCount = i > 0 ? stageBreakdown[i - 1].count : stage.count;
                  const dropOff = prevCount > 0 && i > 0 ? Math.round(((prevCount - stage.count) / prevCount) * 100) : 0;
                  return (
                    <div key={stage.stageId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.stageColor }} />
                          {stage.stageName}
                        </span>
                        <span className="font-medium tabular-nums">
                          {stage.count}
                          {dropOff > 0 && <span className="text-muted-foreground ml-1.5">(-{dropOff}%)</span>}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(stage.count / maxStageCount) * 100}%`,
                            backgroundColor: stage.stageColor,
                            minWidth: stage.count > 0 ? "6px" : "0px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Lead Inflow Trend (30 days) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Lead Inflow (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-[3px] h-32">
                  {(() => {
                    // Fill in missing dates
                    const dateMap = new Map(dailyInflow.map((d) => [d.date, d.count]));
                    const days: { date: string; count: number }[] = [];
                    for (let i = 29; i >= 0; i--) {
                      const d = new Date(Date.now() - i * 86400000);
                      const key = d.toISOString().split("T")[0];
                      days.push({ date: key, count: dateMap.get(key) || 0 });
                    }
                    return days.map((d) => (
                      <div
                        key={d.date}
                        className="flex-1 rounded-t transition-all duration-300 hover:opacity-80 group relative"
                        style={{
                          height: `${Math.max((d.count / maxDailyCount) * 100, d.count > 0 ? 8 : 2)}%`,
                          backgroundColor: d.count > 0 ? "#e8622a" : "var(--muted)",
                        }}
                        title={`${d.date}: ${d.count} leads`}
                      />
                    ));
                  })()}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 4: Source Breakdown + Recent Activity ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Source Performance */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Lead Sources</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sourceBreakdown
                    .sort((a, b) => b.count - a.count)
                    .map((src) => {
                      const pct = summary.totalLeads > 0 ? Math.round((src.count / summary.totalLeads) * 100) : 0;
                      const color = SOURCE_COLORS[src.source] || "#6b7280";
                      return (
                        <div key={src.source} className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs flex-1">{SOURCE_LABELS[src.source] || src.source}</span>
                          <span className="text-xs font-medium tabular-nums">{src.count}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  {sourceBreakdown.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {recentActivity.map((a) => (
                    <Link
                      key={a.id}
                      href={`/leads/${a.leadId}`}
                      className="flex items-start gap-2.5 py-1.5 hover:bg-muted/30 rounded px-1.5 -mx-1.5 transition-colors"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        a.action === "stage_changed" ? "bg-primary" : a.action === "message_sent" ? "bg-blue-400" : "bg-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{a.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {a.userName || "System"} &middot; {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {recentActivity.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 5: BD Performance (admin only) ── */}
          {isAdmin && ownerBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">BD Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">BD / Member</th>
                        {matrixStages.map(([id, s]) => (
                          <th key={id} className="text-center py-2 px-2 font-medium">
                            <span className="flex items-center justify-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.name}
                            </span>
                          </th>
                        ))}
                        <th className="text-center py-2 pl-3 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bdNames.map(([ownerId, ownerName]) => {
                        const row = matrixData.get(ownerId);
                        const rowTotal = matrixStages.reduce((sum, [sid]) => sum + (row?.get(sid) || 0), 0);
                        return (
                          <tr key={ownerId}>
                            <td className="py-2 pr-4 font-medium">{ownerName}</td>
                            {matrixStages.map(([sid, s]) => {
                              const val = row?.get(sid) || 0;
                              return (
                                <td key={sid} className="text-center py-2 px-2 tabular-nums">
                                  {val > 0 ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                                      {val}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center py-2 pl-3 font-bold tabular-nums">{rowTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
