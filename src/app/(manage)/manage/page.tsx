"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2, Plus, ChevronRight, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  slug: string;
  userCount: number;
  pipelineCount: number;
  createdAt: string;
}

interface OrgUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

export default function ManagePage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Create org
  const [showCreate, setShowCreate] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", slug: "" });

  // Create admin for org
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", displayName: "", email: "" });

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manage/orgs");
      if (res.ok) {
        const d = await res.json();
        setOrgs(d.success ? d.data : d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  async function selectOrg(org: Org) {
    setSelectedOrg(org);
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/manage/orgs/${org.id}/users`);
      if (res.ok) {
        const d = await res.json();
        setOrgUsers(d.success ? d.data : d);
      }
    } finally {
      setLoadingUsers(false);
    }
  }

  async function createOrg() {
    const res = await fetch("/api/manage/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrg),
    });
    if (res.ok) {
      toast.success("Organization created");
      setShowCreate(false);
      setNewOrg({ name: "", slug: "" });
      fetchOrgs();
    } else {
      const d = await res.json();
      toast.error(d.error?.message || "Failed");
    }
  }

  async function deleteOrg(orgId: string) {
    if (!confirm("Delete this organization? Only empty orgs can be deleted.")) return;
    const res = await fetch(`/api/manage/orgs/${orgId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Organization deleted");
      setSelectedOrg(null);
      fetchOrgs();
    } else {
      const d = await res.json();
      toast.error(d.error?.message || "Failed");
    }
  }

  async function createAdmin() {
    if (!selectedOrg) return;
    const res = await fetch(`/api/manage/orgs/${selectedOrg.id}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAdmin, role: "admin" }),
    });
    if (res.ok) {
      toast.success("Admin user created");
      setShowCreateAdmin(false);
      setNewAdmin({ username: "", password: "", displayName: "", email: "" });
      selectOrg(selectedOrg);
      fetchOrgs();
    } else {
      const d = await res.json();
      toast.error(d.error?.message || "Failed");
    }
  }

  if (selectedOrg) {
    return (
      <div className="flex flex-col h-full">
        <Header
          title={selectedOrg.name}
          description={`Organization: ${selectedOrg.slug}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrg(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" />Back
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteOrg(selectedOrg.id)}>
                <Trash2 className="w-4 h-4 mr-1" />Delete Org
              </Button>
            </div>
          }
        />
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Users</h2>
            <Sheet open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
              <SheetTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Admin</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Create Org Admin</SheetTitle></SheetHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Username</Label><Input value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} /></div>
                  <div><Label>Display Name</Label><Input value={newAdmin.displayName} onChange={e => setNewAdmin({ ...newAdmin, displayName: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} /></div>
                  <div><Label>Password</Label><Input type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} /></div>
                  <Button onClick={createAdmin} className="w-full">Create Admin</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          {loadingUsers ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <div className="border rounded-lg divide-y">
              {orgUsers.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No users yet. Create an admin to get started.
                </div>
              ) : (
                orgUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{u.displayName}</span>
                        <Badge variant="outline" className="text-xs">{u.role}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">@{u.username}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Organizations" description="Manage all organizations" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">All Organizations ({orgs.length})</h2>
          <Sheet open={showCreate} onOpenChange={setShowCreate}>
            <SheetTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Create Organization</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>Create Organization</SheetTitle></SheetHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Name</Label><Input value={newOrg.name} onChange={e => setNewOrg({ ...newOrg, name: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={newOrg.slug} onChange={e => setNewOrg({ ...newOrg, slug: e.target.value })} placeholder="lowercase-with-hyphens" /></div>
                <Button onClick={createOrg} className="w-full">Create Organization</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="border rounded-lg divide-y">
            {orgs.map(org => (
              <button
                key={org.id}
                onClick={() => selectOrg(org)}
                className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-accent transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{org.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{org.slug}</Badge>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{org.userCount} users</span>
                    <span>{org.pipelineCount} pipelines</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
            {orgs.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No organizations yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
