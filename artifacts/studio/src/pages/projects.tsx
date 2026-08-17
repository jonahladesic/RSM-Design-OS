import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, X, GripVertical, Pencil, Archive, ArchiveRestore, Trash2, MoreHorizontal } from "lucide-react";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";

const PROJECT_COLORS = [
  "#f97316","#E8772E","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#14b8a6","#d97706","#22c55e",
  "#a855f7","#e11d48","#65a30d","#be185d","#047857",
  "#0f766e","#7c3aed","#f43f5e","#84cc16","#c084fc",
];

const PHASE_SUGGESTIONS = [
  "Discovery", "Vision", "Brand Identity", "Brand Standards",
  "City Submittal", "Schematic Design", "Design Development",
  "Construction Documents", "Permitting", "Bidding", "Construction Administration",
];

interface PhaseRow {
  name: string;
  budgetedHours: string;
}

const DEFAULT_FORM = {
  name: "", budgetAmount: "10000", color: PROJECT_COLORS[0],
};

function getUniqueColor(allProjectColors: string[]): string {
  const unused = PROJECT_COLORS.find((c) => !allProjectColors.includes(c));
  if (unused) return unused;
  const counts = PROJECT_COLORS.map((c) => ({
    color: c,
    count: allProjectColors.filter((u) => u === c).length,
  }));
  counts.sort((a, b) => a.count - b.count);
  return counts[0].color;
}

export default function Projects() {
  const { data: projects = [], isLoading } = useListProjects();
  const createProject = useCreateProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [customPhase, setCustomPhase] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [renameProject, setRenameProject] = useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const archiveProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/projects/${id}/archive`, { method: "PUT" });
      if (!r.ok) throw new Error("Failed to archive project");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project archived" });
    },
    onError: () => toast({ title: "Failed to archive project", variant: "destructive" }),
  });

  const unarchiveProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/projects/${id}/unarchive`, { method: "PUT" });
      if (!r.ok) throw new Error("Failed to unarchive project");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project restored" });
    },
    onError: () => toast({ title: "Failed to restore project", variant: "destructive" }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete project");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDeleteTarget(null);
      toast({ title: "Project deleted" });
    },
    onError: () => toast({ title: "Failed to delete project", variant: "destructive" }),
  });

  const renameProjectMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const r = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error("Failed to rename project");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setRenameProject(null);
      toast({ title: "Project renamed" });
    },
    onError: () => toast({ title: "Failed to rename project", variant: "destructive" }),
  });

  const set = (key: string, value: any) => setFormData((f) => ({ ...f, [key]: value }));

  const addPhase = (name: string) => {
    if (!name.trim()) return;
    if (phases.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())) return;
    setPhases((p) => [...p, { name: name.trim(), budgetedHours: "0" }]);
    setCustomPhase("");
  };

  const removePhase = (idx: number) => setPhases((p) => p.filter((_, i) => i !== idx));

  const updatePhaseHours = (idx: number, hours: string) =>
    setPhases((p) => p.map((ph, i) => (i === idx ? { ...ph, budgetedHours: hours } : ph)));

  const totalPhaseHours = phases.reduce((sum, p) => sum + (parseFloat(p.budgetedHours) || 0), 0);

  const handleDialogOpen = (open: boolean) => {
    if (open) {
      const allColors = (projects as any[]).map((p: any) => p.color).filter(Boolean);
      const color = getUniqueColor(allColors);
      setFormData({ ...DEFAULT_FORM, color });
      setPhases([]);
      setCustomPhase("");
    } else {
      setFormData({ ...DEFAULT_FORM });
      setPhases([]);
      setCustomPhase("");
    }
    setIsDialogOpen(open);
  };

  const handleCreate = () => {
    if (!formData.name) return;
    createProject.mutate(
      {
        data: {
          name: formData.name,
          status: "active",
          budgetAmount: Number(formData.budgetAmount),
          color: formData.color,
          phases: phases.map((p) => ({ name: p.name, budgetedHours: parseFloat(p.budgetedHours) || 0 })),
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Project created" });
          setIsDialogOpen(false);
          setFormData({ ...DEFAULT_FORM });
          setPhases([]);
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        },
        onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
      }
    );
  };

  const allProjects = projects as any[];
  const archivedCount = allProjects.filter((p) => p.archivedAt).length;
  const activeProjects = showArchived ? allProjects : allProjects.filter((p) => !p.archivedAt);
  const filtered = filter === "all" ? activeProjects : activeProjects.filter((p) => p.status === filter);
  const usedSuggestions = new Set(phases.map((p) => p.name.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage all active and past studio projects.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Project</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-2">
              <div className="grid gap-2">
                <Label>Project Name *</Label>
                <Input value={formData.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Acme Brand Identity" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Budget ($)</Label>
                  <Input type="number" value={formData.budgetAmount} onChange={(e) => set("budgetAmount", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {PROJECT_COLORS.map((c) => {
                      const isUsed = (projects as any[]).some((p: any) => p.color === c);
                      return (
                        <button key={c}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${formData.color === c ? "border-white scale-110" : "border-transparent"} ${isUsed && formData.color !== c ? "opacity-40" : ""}`}
                          style={{ backgroundColor: c }}
                          onClick={() => set("color", c)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Phases */}
              <div className="border-t pt-4 grid gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Phases</Label>
                  <span className="text-sm font-semibold text-foreground bg-muted/50 px-3 py-1 rounded-md">
                    {totalPhaseHours}h total
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PHASE_SUGGESTIONS.filter((s) => !usedSuggestions.has(s.toLowerCase())).map((s) => (
                    <button key={s}
                      onClick={() => addPhase(s)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>

                {phases.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {phases.map((ph, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        <span className="flex-1 text-sm font-medium">{ph.name}</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" min="0"
                            value={ph.budgetedHours}
                            onChange={(e) => updatePhaseHours(idx, e.target.value)}
                            className="w-20 h-7 text-sm text-right"
                          />
                          <span className="text-xs text-muted-foreground">hrs</span>
                        </div>
                        <button onClick={() => removePhase(idx)} className="text-muted-foreground hover:text-destructive ml-1">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Custom phase name…"
                    value={customPhase}
                    onChange={(e) => setCustomPhase(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addPhase(customPhase); }}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => addPhase(customPhase)} disabled={!customPhase.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createProject.isPending || !formData.name}>
                {createProject.isPending ? "Creating…" : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameProject} onOpenChange={(o) => { if (!o) setRenameProject(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="sr-only">Project name</Label>
            <Input
              autoFocus
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameInput.trim() && renameProject) {
                  renameProjectMutation.mutate({ id: renameProject.id, name: renameInput.trim() });
                } else if (e.key === "Escape") {
                  setRenameProject(null);
                }
              }}
              placeholder="Project name…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameProject(null)}>Cancel</Button>
            <Button
              disabled={!renameInput.trim() || renameProjectMutation.isPending}
              onClick={() => renameProject && renameProjectMutation.mutate({ id: renameProject.id, name: renameInput.trim() })}
            >
              {renameProjectMutation.isPending ? "Saving…" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {["all","active","on_hold","completed","cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            {s === "all" ? "All" : s === "on_hold" ? "On Hold" : s.charAt(0).toUpperCase() + s.slice(1)}
            {" "}<span className="text-xs opacity-70">
              ({s === "all" ? activeProjects.length : activeProjects.filter((p: any) => p.status === s).length})
            </span>
          </button>
        ))}
        {archivedCount > 0 && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${showArchived ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Archive className="h-3.5 w-3.5" />
              Archived
              <span className="text-xs opacity-70">({archivedCount})</span>
            </button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading projects…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 flex flex-col items-center gap-4">
          <div className="text-muted-foreground text-lg">No projects found</div>
          <Button onClick={() => handleDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Create First Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project: any) => {
            const budgeted = parseFloat(project.budgetedHours) || 0;
            const logged = parseFloat(project.loggedHours) || 0;
            const budget = parseFloat(project.budgetAmount) || 0;
            const pct = budgeted > 0 ? (logged / budgeted) * 100 : 0;
            const effRate = logged > 0 ? budget / logged : 0;
            const isArchived = !!project.archivedAt;
            return (
              <div key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="cursor-pointer">
                <Card className={`h-full hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden group/card ${isArchived ? "opacity-60" : ""}`}>
                  <div className="p-5 flex flex-col gap-3 h-full">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color || "#6b7280" }} />
                          <h3 className="font-semibold text-base line-clamp-1">{project.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {budget > 0 ? `$${budget.toLocaleString()}` : "No budget"}
                          {effRate > 0 && ` · $${effRate.toFixed(0)}/hr`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 border-transparent">
                          {isArchived ? "ARCHIVED" : (project.status || "active").replace("_", " ").toUpperCase()}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameProject({ id: project.id, name: project.name });
                                setRenameInput(project.name);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isArchived ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unarchiveProjectMutation.mutate(project.id);
                                }}
                              >
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                Restore
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveProjectMutation.mutate(project.id);
                                }}
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ id: project.id, name: project.name });
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex-1" />

                    {budgeted > 0 ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Hours</span>
                          <span className={`font-medium ${pct > 90 ? "text-destructive" : ""}`}>
                            {logged} / {budgeted}h
                          </span>
                        </div>
                        <Progress value={Math.min(pct, 100)} className="h-1.5" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No phases defined</p>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project along with all its phases, time entries, and allocations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteProjectMutation.mutate(deleteTarget.id)}
            >
              {deleteProjectMutation.isPending ? "Deleting…" : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
