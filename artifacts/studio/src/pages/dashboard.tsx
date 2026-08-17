import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/contexts/auth-context";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useCurrentUser();

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const allProjects = projects as any[];
  const activeProjects = allProjects.filter(
    (p: any) => !p.archivedAt && (p.status === "active" || !p.status)
  );

  const totalBudgeted = activeProjects.reduce((s: number, p: any) => s + (parseFloat(p.budgetedHours) || 0), 0);
  const totalLogged = activeProjects.reduce((s: number, p: any) => s + (parseFloat(p.loggedHours) || 0), 0);
  const totalBudget = activeProjects.reduce((s: number, p: any) => s + (parseFloat(p.budgetAmount) || 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {user?.firstName ? `${user.firstName}'s Dashboard` : "Dashboard"}
      </h1>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b pb-6">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Projects</div>
          <div className="text-2xl font-bold mt-1">{activeProjects.length}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Hours Logged</div>
          <div className="text-2xl font-bold mt-1">{totalLogged}<span className="text-sm font-normal text-muted-foreground">h</span></div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Hours Budgeted</div>
          <div className="text-2xl font-bold mt-1">{totalBudgeted}<span className="text-sm font-normal text-muted-foreground">h</span></div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Budget</div>
          <div className="text-2xl font-bold mt-1">${totalBudget.toLocaleString()}</div>
        </div>
      </div>

      {/* Project table */}
      {activeProjects.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No active projects.{" "}
          <Link href="/projects" className="text-primary underline">
            Create one
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium">Hours</th>
                <th className="pb-2 font-medium w-32">Progress</th>
                <th className="pb-2 font-medium text-right">Budget</th>
                <th className="pb-2 font-medium text-right">Eff. Rate</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.map((project: any) => {
                const budgeted = parseFloat(project.budgetedHours) || 0;
                const logged = parseFloat(project.loggedHours) || 0;
                const budget = parseFloat(project.budgetAmount) || 0;
                const pct = budgeted > 0 ? Math.min((logged / budgeted) * 100, 100) : 0;
                const effRate = logged > 0 ? budget / logged : 0;

                return (
                  <tr key={project.id} className="border-b last:border-0">
                    <td className="py-3">
                      <Link href={`/projects/${project.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color || "#6b7280" }}
                        />
                        <span className="font-medium">{project.name}</span>
                      </Link>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {logged} / {budgeted}h
                    </td>
                    <td className="py-3">
                      <Progress value={pct} className="h-1.5" />
                    </td>
                    <td className="py-3 text-right">
                      {budget > 0 ? `$${budget.toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {effRate > 0 ? `$${effRate.toFixed(0)}/hr` : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {project.status || "active"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
