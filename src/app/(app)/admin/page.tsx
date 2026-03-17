"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2, Plus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import type { Pipeline } from "@/types";

interface OrgUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  pipelines: { id: string; name: string }[];
}

export default function AdminPage() {
  const { user, pipelines: authPipelines } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "pipelines" | "access">("users");
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", displayName: "", email: "", role: "member" });

  // Create pipeline form
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [newPipeline, setNewPipeline] = useState({ name: "", description: "" });

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/pipeline");
    }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, pipelinesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/pipelines"),
      ]);
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.success ? d.data : d);
      }
      if (pipelinesRes.ok) {
        const d = await pipelinesRes.json();
        setPipelines(d.success ? d.data : d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createUser() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      toast.success("User created");
      setShowCreate(false);
      setNewUser({ username: "", password: "", displayName: "", email: "", role: "member" });
      fetchData();
    } else {
      const d = await res.json();
      toast.error(d.error?.message || "Failed");
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) { toast.success("User deleted"); fetchData(); }
  }

  async function resetPassword(userId: string) {
    const newPassword = prompt("Enter new password (min 6 chars):");
    if (!newPassword || newPassword.length < 6) return;
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    if (res.ok) toast.success("Password reset");
    else toast.error("Failed to reset password");
  }

  async function createPipeline() {
    const res = await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPipeline),
    });
    if (res.ok) {
      toast.success("Pipeline created");
      setShowCreatePipeline(false);
      setNewPipeline({ name: "", description: "" });
      fetchData();
    } else {
      const d = await res.json();
      toast.error(d.error?.message || "Failed");
    }
  }

  async function deletePipeline(pipelineId: string) {
    if (!confirm("Delete this pipeline? Only empty pipelines can be deleted.")) return;
    const res = await fetch(`/api/pipelines/${pipelineId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Pipeline deleted"); fetchData(); }
    else {
      const d = await res.json();
      toast.error(d.error?.message || "Failed");
    }
  }

  async function togglePipelineAccess(userId: string, pipelineId: string, currentlyAssigned: boolean) {
    const userObj = users.find(u => u.id === userId);
    if (!userObj) return;
    const currentIds = userObj.pipelines.map(p => p.id);
    const newIds = currentlyAssigned
      ? currentIds.filter(id => id !== pipelineId)
      : [...currentIds, pipelineId];

    const res = await fetch(`/api/admin/users/${userId}/pipelines`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineIds: newIds }),
    });
    if (res.ok) fetchData();
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="flex flex-col h-full">
      <Header title="Admin" description="Manage users, pipelines, and access" />

      <div className="px-6 pt-4">
        <div className="flex gap-1 border-b border-border">
          {(["users", "pipelines", "access"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : tab === "users" ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Users ({users.length})</h2>
              <Sheet open={showCreate} onOpenChange={setShowCreate}>
                <SheetTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add User</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader><SheetTitle>Create User</SheetTitle></SheetHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Username</Label><Input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} /></div>
                    <div><Label>Display Name</Label><Input value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} /></div>
                    <div><Label>Email</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></div>
                    <div><Label>Password</Label><Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} /></div>
                    <div>
                      <Label>Role</Label>
                      <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createUser} className="w-full">Create User</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="border rounded-lg divide-y">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{u.displayName}</span>
                      <Badge variant="outline" className="text-xs">{u.role}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">@{u.username}</span>
                    <div className="flex gap-1 mt-1">
                      {u.pipelines.map(p => (
                        <Badge key={p.id} variant="secondary" className="text-[10px]">{p.name}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => resetPassword(u.id)}>
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    {u.id !== user?.id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteUser(u.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : tab === "pipelines" ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Pipelines ({pipelines.length})</h2>
              <Sheet open={showCreatePipeline} onOpenChange={setShowCreatePipeline}>
                <SheetTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Pipeline</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader><SheetTitle>Create Pipeline</SheetTitle></SheetHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Name</Label><Input value={newPipeline.name} onChange={e => setNewPipeline({ ...newPipeline, name: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={newPipeline.description} onChange={e => setNewPipeline({ ...newPipeline, description: e.target.value })} /></div>
                    <Button onClick={createPipeline} className="w-full">Create Pipeline</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="border rounded-lg divide-y">
              {pipelines.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePipeline(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pipeline Access</h2>
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium">User</th>
                    {pipelines.map(p => (
                      <th key={p.id} className="text-center px-4 py-2 font-medium">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role !== "admin").map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="px-4 py-2">{u.displayName}</td>
                      {pipelines.map(p => {
                        const assigned = u.pipelines.some(up => up.id === p.id);
                        return (
                          <td key={p.id} className="text-center px-4 py-2">
                            <Checkbox
                              checked={assigned}
                              onCheckedChange={() => togglePipelineAccess(u.id, p.id, assigned)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.filter(u => u.role === "admin").length > 0 && (
                <p className="text-xs text-muted-foreground px-4 py-2">
                  Admins automatically have access to all pipelines.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
