import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, CheckCircle2, Circle, Clock, Calendar, Tag, Lock } from "lucide-react";
import { useLockIn, formatDeadline, type Priority } from "@/lib/store";

export function TaskBoard() {
  const { state, addTask, completeTask, deleteTask } = useLockIn();
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Study");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deadline, setDeadline] = useState("");

  const activeTasks = state.tasks.filter((t) => t.status !== "completed");
  const completedTasks = state.tasks.filter((t) => t.status === "completed");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user) {
      alert("Please log in or register an account to save tasks.");
      return;
    }
    if (!title.trim()) return;
    
    addTask({
      title: title.trim(),
      category: category.trim() || "General",
      priority,
      deadline: deadline || new Date(Date.now() + 86400000).toISOString(),
    });

    // Reset form
    setTitle("");
    setCategory("Study");
    setPriority("medium");
    setDeadline("");
    setShowAddForm(false);
  };

  return (
    <div className="card-surface p-5 space-y-4 text-left">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Task Board</h2>
        <button
          onClick={() => {
            if (!state.user) {
              alert("Please log in or register an account to create tasks.");
              return;
            }
            setShowAddForm(!showAddForm);
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition-all"
        >
          <Plus className="size-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {!state.user && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Sign in to create, save, and track your focus tasks.</span>
          </div>
          <div className="flex gap-1.5 shrink-0 font-medium">
            <Link to="/login" className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground">Log In</Link>
            <Link to="/register" className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground">Register</Link>
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="border border-border rounded-xl p-4 bg-muted/30 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="task-title" className="block text-xs font-medium text-muted-foreground mb-1">Task Title</label>
              <input
                id="task-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are we locking in on?"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="task-category" className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
              <input
                id="task-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Math, Coding, Gym"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="task-deadline" className="block text-xs font-medium text-muted-foreground mb-1">Deadline</label>
              <input
                id="task-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 h-9 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      priority === p
                        ? p === "high"
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : p === "medium"
                            ? "border-accent bg-accent/10 text-accent-foreground"
                            : "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:border-muted-foreground/30"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-95 transition-all"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-4">
        {/* Active Tasks */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">To Do ({activeTasks.length})</h3>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-xl">
              All caught up! Time to reward yourself or add a new task.
            </p>
          ) : (
            <div className="space-y-2">
              {activeTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between border border-border rounded-xl p-3 bg-background hover:shadow-soft transition-all">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => completeTask(t.id)}
                      className="text-muted-foreground hover:text-success mt-0.5 transition-colors shrink-0"
                      aria-label="Complete task"
                    >
                      <Circle className="size-5" />
                    </button>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">{t.title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium bg-secondary px-1.5 py-0.5 rounded">
                          <Tag className="size-2.5" />
                          {t.category}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          t.priority === "high"
                            ? "bg-destructive/10 text-destructive"
                            : t.priority === "medium"
                              ? "bg-accent/10 text-accent-foreground"
                              : "bg-primary/10 text-primary"
                        }`}>
                          {t.priority}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Calendar className="size-2.5" />
                          {formatDeadline(t.deadline)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Link
                      to="/focus"
                      search={{ taskId: t.id } as any}
                      className="inline-flex items-center gap-1 bg-accent text-accent-foreground text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-all"
                    >
                      <Clock className="size-3" />
                      <span>Focus</span>
                    </Link>
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-secondary transition-colors"
                      aria-label="Delete task"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Completed ({completedTasks.length})</h3>
            <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
              {completedTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between border border-border rounded-xl p-3 bg-secondary/30 opacity-70">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="size-5 text-success shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground line-through truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{t.category}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-secondary transition-colors"
                    aria-label="Delete task"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
