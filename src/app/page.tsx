"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, UserPlus, MessageSquare, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Stage {
  id: string;
  name: string;
  color: string;
  leadCount: number;
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
  };
}

interface DashboardData {
  totalLeads: number;
  leadsThisMonth: number;
  messagesSent: number;
  conversionRate: number;
  stages: Stage[];
  recentLeads: Lead[];
}

const SOURCE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  manual: "Manual",
  website: "Website",
  referral: "Referral",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [stagesRes, leadsRes, recentRes] = await Promise.all([
          fetch("/api/stages"),
          fetch("/api/leads?limit=1000"),
          fetch("/api/leads?limit=5&sortBy=newest"),
        ]);

        const stages: Stage[] = await stagesRes.json();
        const leadsData = await leadsRes.json();
        const recentData = await recentRes.json();

        const allLeads = leadsData.leads || [];
        const totalLeads = leadsData.pagination?.total || allLeads.length;

        // Calculate leads this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const leadsThisMonth = allLeads.filter(
          (l: Lead) => l.createdAt >= monthStart
        ).length;

        // Calculate messages sent (sum from a rough estimate based on leads)
        // We don't have a dedicated messages count endpoint, so show total leads as proxy
        const messagesSent = allLeads.length; // placeholder

        // Conversion rate: leads in last stage / total
        const sortedStages = [...stages].sort((a, b) => a.order - b.order);
        const lastStage = sortedStages[sortedStages.length - 1];
        const convertedCount = lastStage?.leadCount || 0;
        const conversionRate =
          totalLeads > 0
            ? Math.round((convertedCount / totalLeads) * 100)
            : 0;

        setData({
          totalLeads,
          leadsThisMonth,
          messagesSent,
          conversionRate,
          stages,
          recentLeads: recentData.leads || [],
        });
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="Dashboard" description="Overview of your CRM activity" />
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-0">
                  <div className="h-8 bg-muted rounded w-20 mt-2" />
                  <div className="h-4 bg-muted rounded w-32 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Header title="Dashboard" description="Overview of your CRM activity" />
        <div className="p-8 text-center text-muted-foreground">
          Failed to load dashboard data.
        </div>
      </div>
    );
  }

  const maxLeadCount = Math.max(...data.stages.map((s) => s.leadCount), 1);

  const statCards = [
    {
      title: "Total Leads",
      value: data.totalLeads,
      icon: Users,
      color: "text-[#e8622a]",
      bg: "bg-[#e8622a]/10",
    },
    {
      title: "Leads This Month",
      value: data.leadsThisMonth,
      icon: UserPlus,
      color: "text-[#3a9e6e]",
      bg: "bg-[#3a9e6e]/10",
    },
    {
      title: "Messages Sent",
      value: data.messagesSent,
      icon: MessageSquare,
      color: "text-[#4a8fd4]",
      bg: "bg-[#4a8fd4]/10",
    },
    {
      title: "Conversion Rate",
      value: `${data.conversionRate}%`,
      icon: TrendingUp,
      color: "text-[#c49a3c]",
      bg: "bg-[#c49a3c]/10",
    },
  ];

  return (
    <div>
      <Header title="Dashboard" description="Overview of your CRM activity" />

      <div className="p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads by Stage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.stages
                .sort((a, b) => a.order - b.order)
                .map((stage) => (
                  <div key={stage.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {stage.name}
                      </span>
                      <span className="font-medium">{stage.leadCount}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(stage.leadCount / maxLeadCount) * 100}%`,
                          backgroundColor: stage.color,
                          minWidth: stage.leadCount > 0 ? "8px" : "0px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              {data.stages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stages configured yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                        {lead.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-[#e8622a] transition-colors">
                          {lead.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.phone}
                          {lead.source && ` / ${SOURCE_LABELS[lead.source] || lead.source}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${lead.stage?.color}20`,
                          color: lead.stage?.color,
                        }}
                      >
                        {lead.stage?.name}
                      </span>
                    </div>
                  </Link>
                ))}
                {data.recentLeads.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No leads yet. Add your first lead to get started.
                  </p>
                )}
              </div>
              {data.recentLeads.length > 0 && (
                <Link
                  href="/leads"
                  className="block text-center text-sm text-[#e8622a] hover:text-[#e8622a]/80 mt-4 font-medium transition-colors"
                >
                  View all leads
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
