import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ChevronLeft, Check, X, Pencil, Trash2, Archive, ArchiveRestore,
} from "lucide-react";
import {
  useGetProject, useListTimeBlocks, useUpdateTimeBlock, useUpdateProject, useListClients,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const { data: project, isLoading: projectLoading } = useGetProject(id || "");
  const { data: clients = [] } = useListClients();
  const { data: timeblocks = [] } = useListTimeBlocks({ projectId: id });

  const updateTimeBlock = useUpdateTimeBlock();
  const updateProject = useUpdateProject();

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

  const totalLogged = (timeblocks as any[]).reduce((sum: number, tb: any) => sum + tb.hours, 0);
  const budget = parseFloat(String(project.budgetAmount ?? 0)) || 0;
  const effRate = totalLogged > 0 ? budget / totalLogged : 0;

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
              className="text-lg font-semibold tracking-tight bg-muted/40 border border-primary/40 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-primary/30 min-w-0 max-w-sm"
            />
          ) : (
            <div className="flex items-center gap-2 group/title">
              <h1 className="text-lg font-semibold tracking-tight">{project.name}</h1>
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
      <div className="grid grid-cols-3 gap-4 border-y py-4">
        <div>
          <div className="text-xs text-muted-foreground">Hours Logged</div>
          <div className="text-lg font-semibold">{totalLogged}<span className="text-sm font-normal text-muted-foreground">h</span></div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Budget</div>
          <div className="text-lg font-semibold">{budget > 0 ? `$${budget.toLocaleString()}` : "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Eff. Rate</div>
          <div className="text-lg font-semibold">{effRate > 0 ? `$${effRate.toFixed(0)}` : "—"}<span className="text-sm font-normal text-muted-foreground">/hr</span></div>
        </div>
      </div>

      {/* Time Logs */}
      <div>
        <h2 className="font-semibold mb-3">Time Logs</h2>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(timeblocks as any[]).map((tb) => (
                <TableRow key={tb.id}>
                  <TableCell className="text-sm">{tb.date}</TableCell>
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
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No time logged yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Project Actions */}
      <div className="border rounded-md p-5 grid gap-4 max-w-md">
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
