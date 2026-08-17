import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ChevronLeft, Plus, Check, X, ChevronDown, ChevronRight as ChevronRightIcon,
  Pencil, Trash2, Users, UserCircle, Archive, ArchiveRestore,
} from "lucide-react";
import {
  useGetProject, useListTimeBlocks, useUpdateTimeBlock, useUpdateProject, useListClients,
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PHASE_SUGGESTIONS = [
  "Discovery", "Vision", "Brand Identity", "Brand Standards",
  "City Submittal", "Schematic Design", "Design Development",
  "Construction Documents", "Permitting", "Bidding", "Construction Administration",
];

function PhaseCard({
  phase,
  timeblocks,
  onToggleEnabled,
  onUpdateHours,
  onDelete,
}: {
  phase: any;
  timeblocks: any[];
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onUpdateHours: (id: string, hours: number) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hoursInput, setHoursInput] = useState(String(phase.budgetedHours));

  const phaseBlocks = timeblocks.filter((tb) => tb.phaseId === phase.id);
  const loggedHours = phaseBlocks.reduce((sum: number, tb: any) => sum + tb.hours, 0);
  const pct = phase.budgetedHours > 0 ? (loggedHours / phase.budgetedHours) * 100 : 0;
  const remaining = phase.budgetedHours - loggedHours;
  const isOver = remaining < 0;
  const isDisabled = !phase.enabled;

  const handleSaveHours = () => {
    const h = parseFloat(hoursInput);
    if (!isNaN(h) && h >= 0) onUpdateHours(phase.id, h);
    setEditing(false);
  };

  return (
    <div className={`border rounded-md overflow-hidden transition-opacity ${isDisabled ? "opacity-50" : ""}`}>
      <div className="p-4 flex items-center gap-3">
        <button onClick={() => setExpanded((e) => !e)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <span className={`font-semibold text-sm ${isDisabled ? "line-through text-muted-foreground" : ""}`}>
            {phase.name}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground">Logged</div>
            <div className={`text-sm font-semibold ${isOver ? "text-destructive" : ""}`}>{loggedHours}h</div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted-foreground">Budgeted</div>
            {editing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number" min="0" value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  onBlur={handleSaveHours}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveHours(); if (e.key === "Escape") setEditing(false); }}
                  className="w-20 h-6 text-sm text-right p-1"
                  autoFocus
                />
                <span className="text-xs text-muted-foreground">h</span>
              </div>
            ) : (
              <button
                onClick={() => { setHoursInput(String(phase.budgetedHours)); setEditing(true); }}
                className="flex items-center gap-1 text-sm font-semibold hover:text-primary group"
              >
                {phase.budgetedHours}h
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </button>
            )}
          </div>

          <div className={`text-right hidden sm:block ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
            <div className="text-xs">Remaining</div>
            <div className="text-sm font-medium">
              {isOver ? `-${Math.abs(remaining).toFixed(1)}h` : `${remaining.toFixed(1)}h`}
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-muted-foreground">In Scope</span>
            <Switch checked={phase.enabled} onCheckedChange={(v) => onToggleEnabled(phase.id, v)} />
          </div>

          <button onClick={() => onDelete(phase.id)} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isDisabled && phase.budgetedHours > 0 && (
        <div className="px-4 pb-1">
          <Progress value={Math.min(pct, 100)} className="h-1" />
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t text-xs text-muted-foreground">
          {phaseBlocks.length === 0 ? (
            <p>No time logged for this phase.</p>
          ) : (
            <p>{phaseBlocks.length} time entries totaling {loggedHours}h</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const { data: project, isLoading: projectLoading } = useGetProject(id || "");
  const { data: clients = [] } = useListClients();
  const { data: timeblocks = [] } = useListTimeBlocks({ projectId: id });

  const { data: phases = [], refetch: refetchPhases } = useQuery({
    queryKey: ["/api/projects", id, "phases"],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${id}/phases`);
      return r.json();
    },
    enabled: !!id,
  });

  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["/api/projects", id, "members"],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${id}/members`);
      return r.json();
    },
    enabled: !!id,
  });

  const updateTimeBlock = useUpdateTimeBlock();
  const updateProject = useUpdateProject();

  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseHours, setNewPhaseHours] = useState("0");
  const [showAddPhase, setShowAddPhase] = useState(false);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"lead" | "designer">("designer");

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const PROJECT_COLORS = ["#f97316","#E8772E","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];

  const openEditProject = () => {
    if (!project) return;
    setEditForm({
      name: (project as any).name || "",
      clientId: (project as any).clientId || "",
      status: (project as any).status || "active",
      budgetAmount: String((project as any).budgetAmount ?? ""),
      color: (project as any).color || "#f97316",
      description: (project as any).description || "",
    });
    setEditProjectOpen(true);
  };

  const setEdit = (k: string, v: any) => setEditForm((f: any) => ({ ...f, [k]: v }));

  const handleSaveProject = () => {
    if (!editForm || !project) return;
    updateProject.mutate(
      {
        id: (project as any).id,
        data: {
          name: editForm.name,
          clientId: editForm.clientId || undefined,
          status: editForm.status,
          budgetAmount: Number(editForm.budgetAmount) || undefined,
          color: editForm.color,
          description: editForm.description || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Project updated" });
          setEditProjectOpen(false);
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        },
        onError: () => toast({ title: "Failed to update project", variant: "destructive" }),
      }
    );
  };

  const addPhaseMutation = useMutation({
    mutationFn: async (data: { name: string; budgetedHours: number }) => {
      const r = await fetch(`/api/projects/${id}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, sortOrder: (phases as any[]).length }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Phase added" });
      setNewPhaseName("");
      setNewPhaseHours("0");
      setShowAddPhase(false);
      refetchPhases();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async (data: { id: string; [key: string]: any }) => {
      const { id: phId, ...body } = data;
      const r = await fetch(`/api/phases/${phId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      refetchPhases();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
    },
  });

  const deletePhaseMutation = useMutation({
    mutationFn: async (phaseId: string) => {
      const r = await fetch(`/api/phases/${phaseId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Phase removed" });
      refetchPhases();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { name: string; role: string }) => {
      const r = await fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Team member added" });
      setNewMemberName("");
      setNewMemberRole("designer");
      refetchMembers();
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const r = await fetch(`/api/projects/${id}/members/${memberId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Team member removed" });
      refetchMembers();
    },
  });

  const handleApproveTime = (tbId: string, approved: boolean) => {
    updateTimeBlock.mutate({ id: tbId, data: { approved } as any }, {
      onSuccess: () => {
        toast({ title: approved ? "Time approved" : "Time unapproved" });
        queryClient.invalidateQueries({ queryKey: ["/api/timeblocks"] });
      },
    });
  };

  if (projectLoading) return <div className="p-8 text-muted-foreground">Loading project…</div>;
  if (!project) return <div className="p-8 text-destructive">Project not found</div>;

  const sortedPhases = [...(phases as any[])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const enabledPhases = sortedPhases.filter((p) => p.enabled);
  const totalBudgeted = enabledPhases.reduce((sum: number, p: any) => sum + p.budgetedHours, 0);
  const totalLogged = (timeblocks as any[]).reduce((sum: number, tb: any) => sum + tb.hours, 0);
  const totalRemaining = totalBudgeted - totalLogged;
  const isOverBudget = totalRemaining < 0;
  const budget = parseFloat(project.budgetAmount) || 0;
  const effRate = totalLogged > 0 ? budget / totalLogged : 0;

  const usedSuggestions = new Set(sortedPhases.map((p: any) => p.name.toLowerCase()));

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <Link href="/projects">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
          <ChevronLeft className="h-4 w-4" /> Projects
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: project.color || "var(--primary)" }} />
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => {
                if (nameInput.trim() && nameInput.trim() !== project.name) {
                  updateProject.mutate({ id: project.id, data: { name: nameInput.trim() } as any });
                }
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                else if (e.key === "Escape") setEditingName(false);
              }}
              className="text-2xl font-bold tracking-tight bg-muted/40 border border-primary/40 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-primary/30 min-w-0 max-w-sm"
            />
          ) : (
            <div className="flex items-center gap-2 group/title">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <button
                onClick={() => { setNameInput(project.name); setEditingName(true); }}
                className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <Badge variant="outline" className="uppercase">{project.status?.replace("_", " ")}</Badge>
          <Button variant="outline" size="sm" onClick={openEditProject} className="ml-2">
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        </div>
        <p className="text-muted-foreground">{(project as any).clientName || "Internal Project"}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-4 border-y py-4">
        <div>
          <div className="text-xs text-muted-foreground">Budgeted</div>
          <div className="text-xl font-bold">{totalBudgeted}<span className="text-sm font-normal text-muted-foreground">h</span></div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Logged</div>
          <div className="text-xl font-bold">{totalLogged}<span className="text-sm font-normal text-muted-foreground">h</span></div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{isOverBudget ? "Over Budget" : "Remaining"}</div>
          <div className={`text-xl font-bold ${isOverBudget ? "text-destructive" : "text-emerald-500"}`}>
            {isOverBudget ? "-" : ""}{Math.abs(totalRemaining).toFixed(1)}<span className="text-sm font-normal text-muted-foreground">h</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Budget</div>
          <div className="text-xl font-bold">{budget > 0 ? `$${budget.toLocaleString()}` : "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Eff. Rate</div>
          <div className="text-xl font-bold">{effRate > 0 ? `$${effRate.toFixed(0)}` : "—"}<span className="text-sm font-normal text-muted-foreground">/hr</span></div>
        </div>
      </div>

      <Tabs defaultValue="phases" className="w-full">
        <TabsList className="bg-muted/20">
          <TabsTrigger value="phases">Phases</TabsTrigger>
          <TabsTrigger value="time">Time Logs</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* PHASES TAB */}
        <TabsContent value="phases" className="mt-5">
          <div className="flex flex-col gap-3">
            {sortedPhases.length === 0 ? (
              <div className="border rounded-md p-8 text-center">
                <p className="text-muted-foreground mb-4">No phases defined for this project yet.</p>
                <Button onClick={() => setShowAddPhase(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add First Phase
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {PHASE_SUGGESTIONS.filter((s) => !usedSuggestions.has(s.toLowerCase())).slice(0, 6).map((s) => (
                    <button key={s}
                      onClick={() => addPhaseMutation.mutate({ name: s, budgetedHours: 0 })}
                      className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>

                {sortedPhases.map((phase: any) => (
                  <PhaseCard
                    key={phase.id}
                    phase={phase}
                    timeblocks={timeblocks as any[]}
                    onToggleEnabled={(phId, enabled) => updatePhaseMutation.mutate({ id: phId, enabled })}
                    onUpdateHours={(phId, budgetedHours) => {
                      updatePhaseMutation.mutate({ id: phId, budgetedHours });
                      const newTotal = sortedPhases.reduce((sum: number, p: any) =>
                        sum + (p.id === phId ? budgetedHours : p.budgetedHours), 0);
                      updateProject.mutate({ id: project.id, data: { budgetedHours: newTotal } as any });
                    }}
                    onDelete={(phId) => deletePhaseMutation.mutate(phId)}
                  />
                ))}
              </>
            )}

            {showAddPhase ? (
              <div className="border rounded-md p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 grid gap-2">
                    <Label>Phase Name</Label>
                    <Input
                      placeholder="e.g. Brand Standards"
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPhaseName.trim())
                          addPhaseMutation.mutate({ name: newPhaseName.trim(), budgetedHours: parseFloat(newPhaseHours) || 0 });
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="w-28 grid gap-2">
                    <Label>Hours</Label>
                    <Input type="number" min="0" value={newPhaseHours} onChange={(e) => setNewPhaseHours(e.target.value)} />
                  </div>
                  <Button
                    onClick={() => {
                      if (!newPhaseName.trim()) return;
                      addPhaseMutation.mutate({ name: newPhaseName.trim(), budgetedHours: parseFloat(newPhaseHours) || 0 });
                    }}
                    disabled={!newPhaseName.trim() || addPhaseMutation.isPending}
                  >
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddPhase(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="self-start" onClick={() => setShowAddPhase(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Phase
              </Button>
            )}
          </div>
        </TabsContent>

        {/* TIME LOGS TAB */}
        <TabsContent value="time" className="mt-5">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(timeblocks as any[]).map((tb) => (
                  <TableRow key={tb.id}>
                    <TableCell className="text-sm">{tb.date}</TableCell>
                    <TableCell>{tb.phaseName || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{tb.hours}h</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">{tb.description || "—"}</TableCell>
                    <TableCell>
                      <button onClick={() => handleApproveTime(tb.id, !tb.approved)}>
                        {tb.approved
                          ? <Check className="h-4 w-4 text-emerald-500" />
                          : <X className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {(timeblocks as any[]).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No time logged yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team" className="mt-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Team Members</h3>
            </div>

            {/* Inline add member */}
            <div className="flex gap-2">
              <Input
                placeholder="Name…"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMemberName.trim())
                    addMemberMutation.mutate({ name: newMemberName.trim(), role: newMemberRole });
                }}
                className="flex-1"
              />
              <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as "lead" | "designer")}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Project Lead</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  if (!newMemberName.trim()) return;
                  addMemberMutation.mutate({ name: newMemberName.trim(), role: newMemberRole });
                }}
                disabled={!newMemberName.trim() || addMemberMutation.isPending}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {(members as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No team members assigned yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(members as any[]).map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3 border rounded-md p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{member.name}</div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {member.role === "lead" ? "Lead" : "Designer"}
                    </Badge>
                    <button
                      onClick={() => deleteMemberMutation.mutate(member.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="mt-5">
          <div className="grid gap-4 max-w-md">
            <div className="border rounded-md p-5 grid gap-4">
              <h3 className="font-semibold">Project Actions</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{(project as any)?.archivedAt ? "Restore Project" : "Archive Project"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {(project as any)?.archivedAt
                      ? "Restore this project to your active list."
                      : "Move out of your active list. Can be restored later."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const action = (project as any)?.archivedAt ? "unarchive" : "archive";
                    try {
                      await fetch(`/api/projects/${id}/${action}`, { method: "PUT" });
                      toast({ title: action === "archive" ? "Project archived" : "Project restored" });
                      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
                    } catch {
                      toast({ title: `Failed to ${action} project`, variant: "destructive" });
                    }
                  }}
                >
                  {(project as any)?.archivedAt ? (
                    <><ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Restore</>
                  ) : (
                    <><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</>
                  )}
                </Button>
              </div>
              <div className="border-t pt-4 flex items-center justify-between">
                <div>
                  <Label className="text-destructive">Delete Project</Label>
                  <p className="text-xs text-muted-foreground">Permanently delete this project and all its data.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{project?.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this project and all its data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          try {
                            await fetch(`/api/projects/${id}`, { method: "DELETE" });
                            toast({ title: "Project deleted" });
                            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                            navigate("/projects");
                          } catch {
                            toast({ title: "Failed to delete project", variant: "destructive" });
                          }
                        }}
                      >
                        Delete Project
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Project Dialog */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Project Name</Label>
                <Input value={editForm.name} onChange={(e) => setEdit("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Client</Label>
                  <Select value={editForm.clientId || "none"} onValueChange={(v) => setEdit("clientId", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {(clients as any[]).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEdit("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Budget ($)</Label>
                  <Input type="number" value={editForm.budgetAmount} onChange={(e) => setEdit("budgetAmount", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Color</Label>
                  <div className="flex gap-1.5 items-center h-9">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${editForm.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setEdit("color", c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Project description..."
                  value={editForm.description}
                  onChange={(e) => setEdit("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProject} disabled={updateProject.isPending || !editForm?.name}>
              {updateProject.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
