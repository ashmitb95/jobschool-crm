"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Loader2,
  Save,
  Phone,
  Mail,
  Globe,
  Calendar,
  MessageSquare,
} from "lucide-react";

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface Message {
  id: string;
  leadId: string;
  body: string;
  channel: string;
  status: string;
  direction: string;
  sentAt: string | null;
  createdAt: string;
}

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  sourceAdId: string | null;
  stageId: string;
  notes: string | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
  stage: Stage;
  messages: Message[];
}

const SOURCE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  manual: "Manual",
  website: "Website",
  referral: "Referral",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#c49a3c",
  sent: "#4a8fd4",
  delivered: "#3a9e6e",
  read: "#3a9e6e",
  failed: "#ef4444",
};

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStage, setChangingStage] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Message send state
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/leads");
          return;
        }
        throw new Error("Failed to fetch lead");
      }
      const data: LeadDetail = await res.json();
      setLead(data);
      setEditName(data.name);
      setEditPhone(data.phone);
      setEditEmail(data.email || "");
      setEditNotes(data.notes || "");
    } catch (err) {
      console.error("Failed to fetch lead:", err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // Fetch stages
  useEffect(() => {
    fetch("/api/stages")
      .then((res) => res.json())
      .then((data) => setStages(data))
      .catch(console.error);
  }, []);

  async function handleStageChange(newStageId: string) {
    if (!lead || newStageId === lead.stageId) return;
    setChangingStage(true);
    try {
      const res = await fetch(`/api/leads/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: newStageId }),
      });
      if (res.ok) {
        await fetchLead();
      }
    } catch (err) {
      console.error("Failed to change stage:", err);
    } finally {
      setChangingStage(false);
    }
  }

  async function handleSave() {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      if (res.ok) {
        await fetchLead();
      }
    } catch (err) {
      console.error("Failed to update lead:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageBody.trim() || !lead) return;
    setSendingMessage(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          body: messageBody.trim(),
          channel: "whatsapp",
        }),
      });
      if (res.ok) {
        setMessageBody("");
        await fetchLead();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSendingMessage(false);
    }
  }

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

  function formatDateTime(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div>
        <Header
          title="Lead Details"
          actions={
            <Button variant="ghost" onClick={() => router.push("/leads")}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          }
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div>
        <Header
          title="Lead Not Found"
          actions={
            <Button variant="ghost" onClick={() => router.push("/leads")}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          }
        />
        <div className="p-8 text-center text-muted-foreground">
          This lead could not be found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={lead.name}
        description={`Added ${formatDate(lead.createdAt)} via ${SOURCE_LABELS[lead.source] || lead.source}`}
        actions={
          <div className="flex items-center gap-3">
            {/* Stage Selector */}
            <Select
              value={lead.stageId}
              onValueChange={handleStageChange}
              disabled={changingStage}
            >
              <SelectTrigger className="w-[180px]">
                {changingStage ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
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

            <Button variant="ghost" onClick={() => router.push("/leads")}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-8">
          {/* Left Column - Lead Info & Edit */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Info Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{lead.phone}</span>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{lead.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{SOURCE_LABELS[lead.source] || lead.source}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{formatDate(lead.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm pt-1">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${lead.stage?.color}20`,
                      color: lead.stage?.color,
                    }}
                  >
                    {lead.stage?.name}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Edit Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes about this lead..."
                    className="min-h-28"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Activity Timeline */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="flex flex-col flex-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messages
                  <span className="text-xs text-muted-foreground font-normal">
                    ({lead.messages.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages List */}
                <div className="flex-1 space-y-3 mb-4 max-h-[500px] overflow-y-auto pr-1">
                  {lead.messages.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No messages yet.</p>
                      <p className="text-xs mt-1">
                        Send the first message below.
                      </p>
                    </div>
                  ) : (
                    lead.messages
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a.createdAt).getTime() -
                          new Date(b.createdAt).getTime()
                      )
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.direction === "outbound"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3.5 py-2.5 ${
                              msg.direction === "outbound"
                                ? "bg-[#e8622a]/10 border border-[#e8622a]/20"
                                : "bg-muted border border-border"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.body}
                            </p>
                            <div className="flex items-center justify-between gap-3 mt-1.5">
                              <span className="text-[10px] text-muted-foreground">
                                {formatDateTime(msg.createdAt)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground uppercase">
                                  {msg.channel}
                                </span>
                                <span
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{
                                    backgroundColor:
                                      STATUS_COLORS[msg.status] || "#6b7280",
                                  }}
                                  title={msg.status}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-end gap-2 pt-3 border-t border-border"
                >
                  <Textarea
                    placeholder="Type a message..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className="min-h-10 max-h-28 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!messageBody.trim() || sendingMessage}
                    className="shrink-0"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
