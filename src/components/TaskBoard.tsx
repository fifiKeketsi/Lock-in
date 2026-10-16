import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, CheckCircle2, Circle, Clock, Calendar, Tag, Lock, CheckSquare, Sparkles } from "lucide-react";
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
    <div className="sfb-card p-6 space-y-5 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="sfb-badge-lemon text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
            <CheckSquare className="size-3" /> Planner
          </span>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Active Tasks</h2>
        </div>
        <button
          onClick={() => {
            if (!state.user) {
              alert("Please log in or register an account to create tasks.");
              return;
            }
            setShowAddForm(!showAddForm);
          }}
          className="sfb-btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3.5"
        >
          <Plus className="size-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {!state.user && (
        <div className="rounded-2xl bg-[#fff5ec] dark:bg-[#391f0c] border border-[#ffaa6b]/50 p-4 text-xs text-[#4a1d00] dark:text-[#ffca98] flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="size-4 shrink-0 text-[#f98538]" />
            <span>Sign in to store assignments, link timers, and keep your tasks synced.</span>
          </div>
          <div className="flex gap-1.5 shrink-0 font-medium">
            <Link to="/login" className="px-3 py-1 rounded-full bg-[#191919] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#191919]">Log In</Link>
            <Link to="/register" className="px-3 py-1 rounded-full border border-[#ffaa6b] bg-white/50 dark:bg-black/20">Register</Link>
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="border border-border rounded-2xl p-5 bg-card/60 backdrop-blur space-y-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="task-title" className="block text-xs font-semibold text-muted-foreground mb-1.5">Task Objective</label>
              <input
                id="task-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read Chapter 4 Biology notes & write flashcards"
                className="w-full h-10 rounded-full border border-border bg-card px-4 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div>
              <label htmlFor="task-category" className="block text-xs font-semibold text-muted-foreground mb-1.5">Category</label>
              <input
                id="task-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Biology, Calculus, Prep"
                className="w-full h-10 rounded-full border border-border bg-card px-4 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div>
              <label htmlFor="task-deadline" className="block text-xs font-semibold text-muted-foreground mb-1.5">Deadline</label>
              <input
                id="task-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 rounded-full border border-border bg-card px-4 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Priority</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 h-8.5 rounded-full border text-xs font-bold capitalize transition-all ${
                      priority === p
                        ? p === "high"
                          ? "border-[#ef4444] bg-[#fee2e2] text-[#991b1b] dark:bg-[#450a0a] dark:text-[#fecaca]"
                          : p === "medium"
                            ? "border-[#ded877] bg-[#f9f284] text-[#604e00] dark:bg-[#2c2612] dark:text-[#f9f284]"
                            : "border-[#a6d9db] bg-[#bbeef0] text-[#00363a] dark:bg-[#002d30] dark:text-[#bbeef0]"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-1.5 text-xs rounded-full border border-border text-muted-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sfb-btn-primary text-xs py-1.5 px-4 font-semibold"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-4">
        {/* Active Tasks */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
            <span>To Do ({activeTasks.length})</span>
            {activeTasks.length > 0 && <span className="text-[11px] font-normal lowercase">click circle to complete</span>}
          </div>
          {activeTasks.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-2xl bg-secondary/20">
              <Sparkles className="size-5 mx-auto text-muted-foreground mb-1.5 opacity-60" />
              <p className="text-xs font-semibold text-foreground">You are all caught up!</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Click "New Task" above or start a free focus session.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border border-border rounded-2xl p-3.5 bg-card hover:border-black/20 dark:hover:border-white/20 transition-all shadow-xs group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => completeTask(t.id)}
                      className="text-muted-foreground hover:text-[#16a34a] mt-0.5 transition-colors shrink-0 p-0.5"
                      aria-label="Complete task"
                    >
                      <Circle className="size-4.5" />
                    </button>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">{t.title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-full">
                          <Tag className="size-2.5 text-muted-foreground" />
                          {t.category}
                        </span>
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          t.priority === "high"
                            ? "bg-[#fee2e2] text-[#991b1b] dark:bg-[#450a0a] dark:text-[#fecaca]"
                            : t.priority === "medium"
                              ? "bg-[#f9f284] text-[#604e00] dark:bg-[#2c2612] dark:text-[#f9f284]"
                              : "bg-[#bbeef0] text-[#00363a] dark:bg-[#002d30] dark:text-[#bbeef0]"
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
                      className="sfb-btn-primary inline-flex items-center gap-1.5 text-xs py-1 px-3"
                    >
                      <Clock className="size-3" />
                      <span>Focus</span>
                    </Link>
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="size-7 rounded-full text-muted-foreground hover:text-[#dc2626] hover:bg-destructive/10 flex items-center justify-center transition-colors"
                      aria-label="Delete task"
                      title="Delete task"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Completed ({completedTasks.length})</h3>
            <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
              {completedTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between border border-border/60 rounded-2xl p-3 bg-secondary/30 opacity-70">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="size-4.5 text-[#16a34a] shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-xs md:text-sm text-foreground line-through truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{t.category}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="size-6 rounded-full text-muted-foreground hover:text-[#dc2626] flex items-center justify-center transition-colors"
                    aria-label="Delete task"
                  >
                    <Trash2 className="size-3.5" />
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
