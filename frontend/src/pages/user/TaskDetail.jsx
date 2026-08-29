import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import UserLayout from "../../components/layout/UserLayout";
import { getTaskDetail, getProjectTasks, flagTaskIssue } from "../../api/user.api";
import Modal from "../../components/ui/Modal";
import AudioRecorder from "../../components/task/AudioRecorder";
import TextToReadCard from "../../components/task/TextToReadCard";
import ChineseReadCard from "../../components/task/ChineseReadCard";
import { ChevronLeft, CheckCircle2, Flag } from "lucide-react";
import { PageSpinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const statusBadge = (s) => {
  if (s === "completed") return <span className="badge-done">Completed</span>;
  if (s === "skipped") return <span className="badge-pending">Skipped</span>;
  if (s === "in-progress") return <span className="badge-progress">In Progress</span>;
  return <span className="badge-pending">Pending</span>;
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchingTask, setSwitchingTask] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [recorderSubmitting, setRecorderSubmitting] = useState(false);

  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagComment, setFlagComment] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const refreshProjectTasks = async (projectId) => {
    const tasksRes = await getProjectTasks(projectId);
    setProjectTasks(tasksRes.data.data.tasks || []);
  };

  const fetchTask = async (taskId, { smooth = false } = {}) => {
    if (!taskId) return;

    if (smooth) setSwitchingTask(true);
    else setLoading(true);

    try {
      const taskRes = await getTaskDetail(taskId);
      const taskData = taskRes.data.data;
      setTask(taskData);

      if (!activeProjectId || activeProjectId !== String(taskData.projectId) || projectTasks.length === 0) {
        const tasksRes = await getProjectTasks(taskData.projectId);
        setProjectTasks(tasksRes.data.data.tasks || []);
        setActiveProjectId(String(taskData.projectId));
      }
    } catch {
      toast.error("Failed to load task");
    } finally {
      if (smooth) setSwitchingTask(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    const isInitialLoad = !task;
    fetchTask(id, { smooth: !isInitialLoad });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSkipTask = async () => {
    if (!nextTask) {
      toast("You are on the last task");
      return;
    }
    navigate(`/user/tasks/${nextTask._id}`);
  };

  const handleFlagTask = async () => {
    setFlagComment("");
    setIsFlagModalOpen(true);
  };

  const submitFlagTask = async (event) => {
    event.preventDefault();
    const note = flagComment.trim();

    if (!note) {
      toast.error("Please add a comment before flagging the task.");
      return;
    }

    setFlagSubmitting(true);
    try {
      await flagTaskIssue(id, { note });
      toast.success("Task flagged. Thanks for reporting.");
      setIsFlagModalOpen(false);
      setFlagComment("");
      await fetchTask(id, { smooth: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to report task issue");
    } finally {
      setFlagSubmitting(false);
    }
  };

  const currentTaskIndex = useMemo(
    () => projectTasks.findIndex((t) => t._id === id),
    [projectTasks, id]
  );
  const prevTask = currentTaskIndex > 0 ? projectTasks[currentTaskIndex - 1] : null;
  const nextTask = currentTaskIndex >= 0 ? projectTasks[currentTaskIndex + 1] : null;
  const completedCount = projectTasks.filter((t) => t.status === "completed").length;
  const progressPercent = projectTasks.length ? Math.round((completedCount / projectTasks.length) * 100) : 0;

  if (loading) return <UserLayout><PageSpinner /></UserLayout>;
  if (!task) return <UserLayout><p className="text-slate-400">Task not found.</p></UserLayout>;

  const isChineseRead = task.type === "Chinese Read";

  return (
    <UserLayout>
      <div className="pb-32 md:pb-0">
      <Link
        to={task?.projectId ? `/user/projects/${task.projectId}` : "/user"}
        className="flex items-center gap-1.5 text-sm text-black/70 hover:text-black mb-6 transition"
      >
        <ChevronLeft size={16} /> Back to Tasks
      </Link>

      {switchingTask && (
        <div className="mb-4 text-xs text-primary-500">Loading next task...</div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-primary-400 bg-primary-500/10 px-2.5 py-0.5 rounded">
              {task.taskId}
            </span>
            {statusBadge(task.status)}
          </div>
          <h1 className="text-xl font-bold text-white">{task.type}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-x-hidden">
        {/* Left: Task content */}
        <div className="space-y-4 min-w-0">
          <div className="card">
            <p className="text-sm text-black/70 font-medium mb-2">{completedCount}/{projectTasks.length || 0} Completed</p>
            <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden mb-3">
              <div className="h-full bg-primary-700" style={{ width: `${progressPercent}%` }} />
            </div>
            <button
              type="button"
              onClick={handleSkipTask}
              disabled={recorderSubmitting || !nextTask}
              className="btn-secondary text-sm px-4 py-1.5 disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleFlagTask}
              disabled={recorderSubmitting || flagSubmitting}
              className="btn-secondary text-sm px-4 py-1.5 inline-flex items-center gap-1.5"
            >
              <Flag size={14} /> Flag
            </button>
          </div>

          {/* Prompt */}
          <div className="card">
            <p className="label mb-2">Prompt</p>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-all">{task.prompt}</p>
          </div>

          {isChineseRead ? (
            <ChineseReadCard
              key={task._id}
              task={task}
              onTaskUpdate={(patch) => setTask((t) => ({ ...t, ...patch }))}
            />
          ) : (
            <TextToReadCard key={task._id} task={task} />
          )}

          {/* Audio status */}
          {(task.audio?.publicId || task.audio?.url) && (
            <div className="card border-emerald-500/30">
              <p className="label text-emerald-400 mb-2">Audio Recorded</p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-300 font-medium">Audio uploaded successfully</p>
                  <p className="mt-0.5">{(task.audio.fileSizeBytes / 1024).toFixed(1)} KB · {task.audio.sampleRate} Hz · {task.audio.bitDepth}-bit · Mono</p>
                  <p className="mt-0.5 text-slate-500">{new Date(task.audio.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Record status */}
        <div className="space-y-4 min-w-0">
          <AudioRecorder
            task={task}
            taskId={id}
            prevTask={prevTask}
            nextTask={nextTask}
            onNavigate={(taskId) => navigate(`/user/tasks/${taskId}`)}
            onSubmittingChange={setRecorderSubmitting}
            onAfterUpload={async ({ background } = {}) => {
              await refreshProjectTasks(task.projectId);
              // A background upload means the user has already navigated to the next
              // task by the time this resolves — refetching here would clobber it.
              if (!background) await fetchTask(id);
            }}
          />
        </div>
      </div>
      </div>

      {isFlagModalOpen && (
        <Modal title="Flag Task" onClose={() => !flagSubmitting && setIsFlagModalOpen(false)} size="md">
          <form onSubmit={submitFlagTask} className="space-y-4">
            <div>
              <p className="text-sm text-black/70 mb-2">Describe the issue you found in this task.</p>
              <textarea
                className="input resize-none"
                rows={4}
                placeholder="Write your comment"
                value={flagComment}
                onChange={(e) => setFlagComment(e.target.value)}
                maxLength={500}
                required
                disabled={flagSubmitting}
              />
              <p className="text-xs text-black/55 mt-1">{flagComment.length}/500</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsFlagModalOpen(false)}
                disabled={flagSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={flagSubmitting}>
                {flagSubmitting ? "Submitting..." : "Submit Flag"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </UserLayout>
  );
}
