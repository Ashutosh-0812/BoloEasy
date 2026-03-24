import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import UserLayout from "../../components/layout/UserLayout";
import { getTaskDetail, getProjectTasks, streamAudio, uploadAudio } from "../../api/user.api";
import {
  ChevronLeft, Mic, Square, CheckCircle2, Languages, Play, Pause, SkipBack, SkipForward,
} from "lucide-react";
import { PageSpinner, Spinner } from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const statusBadge = (s) => {
  if (s === "completed") return <span className="badge-done">Completed</span>;
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
  const [selectedLanguage, setSelectedLanguage] = useState("default");
  const [projectTasks, setProjectTasks] = useState([]);

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);

  const loadRecordedAudio = async (taskId) => {
    try {
      const response = await streamAudio(taskId);
      const url = URL.createObjectURL(response.data);
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  };

  const fetchTask = async (taskId, { smooth = false } = {}) => {
    if (smooth) setSwitchingTask(true);
    else setLoading(true);

    try {
      const taskRes = await getTaskDetail(taskId);
      const taskData = taskRes.data.data;
      setTask(taskData);
      setSelectedLanguage("default");

      if (!activeProjectId || activeProjectId !== String(taskData.projectId) || projectTasks.length === 0) {
        const tasksRes = await getProjectTasks(taskData.projectId);
        setProjectTasks(tasksRes.data.data.tasks || []);
        setActiveProjectId(String(taskData.projectId));
      }

      if (taskData.audio?.publicId || taskData.audio?.url) {
        await loadRecordedAudio(taskId);
      } else {
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
      setAudioBlob(null);
      setPlaying(false);
      setCurrentTime(0);
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
  }, [id]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ─── Recording ───────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setPlaying(false);
        setCurrentTime(0);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied. Please allow mic access.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const handleUploadAudio = async () => {
    if (recording) {
      toast.error("Stop recording before submitting.");
      return;
    }

    if (!audioBlob) {
      toast.error("Please record audio first.");
      return;
    }

    setSubmitting(true);
    try {
      const file = new File([audioBlob], `${task.taskId}.wav`, { type: "audio/wav" });
      await uploadAudio(id, file);
      toast.success("Audio submitted successfully!");
      await fetchTask();
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !audioUrl) {
      toast.error("No recorded audio available.");
      return;
    }

    try {
      if (playing) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setPlaying((prev) => !prev);
    } catch {
      toast.error("Unable to play audio.");
    }
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
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

  const languageOptions = [
    { label: "Default", value: "default" },
    ...Object.entries(task.languageVariants || {})
      .filter(([, value]) => Boolean(String(value || "").trim()))
      .map(([label]) => ({ label, value: label })),
  ];

  const textToRead = selectedLanguage === "default"
    ? task.text
    : task.languageVariants?.[selectedLanguage] || task.text;

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
              onClick={() => nextTask ? navigate(`/user/tasks/${nextTask._id}`) : toast("You are on the last task")}
              className="btn-primary text-sm px-4 py-1.5"
            >
              Next
            </button>
          </div>

          {/* Prompt */}
          <div className="card">
            <p className="label mb-2">Prompt</p>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-all">{task.prompt}</p>
          </div>

          {/* Text to read */}
          <div className="card bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="label text-primary-400">Text to Read</p>
              {languageOptions.length > 1 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs text-primary-500">
                    <Languages size={14} /> 
                  </span>
                  <select
                    className="input !h-9 !py-1.5 !px-2.5 !text-sm min-w-[140px] max-w-[180px]"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="text-primary-900 text-lg font-medium leading-relaxed whitespace-pre-wrap break-all">{textToRead}</p>
          </div>

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
          <div className="card">
            <p className="label mb-3">Recording Status</p>
            <p className="text-sm text-slate-400 mb-3">
              {recording ? "Recording in progress..." : audioBlob ? "New recording ready to upload." : "Use recorder controls below."}
            </p>

            <div className="hidden md:flex items-center justify-between rounded-2xl bg-primary-700 px-5 py-4 mb-4">
              <button
                type="button"
                onClick={() => prevTask ? navigate(`/user/tasks/${prevTask._id}`) : toast("This is the first task")}
                className="w-12 h-12 rounded-full bg-white text-primary-700 flex items-center justify-center disabled:opacity-40"
                disabled={!prevTask}
                aria-label="Previous task"
              >
                <SkipBack size={26} />
              </button>

              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition ${recording ? "bg-red-500 animate-pulse" : "bg-white"}`}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                {recording ? <Square size={22} className="text-white" /> : <Mic size={24} className="text-primary-700" />}
              </button>

              <button
                type="button"
                onClick={() => nextTask ? navigate(`/user/tasks/${nextTask._id}`) : toast("You are on the last task")}
                className="w-12 h-12 rounded-full bg-white text-primary-700 flex items-center justify-center disabled:opacity-40"
                disabled={!nextTask}
                aria-label="Next task"
              >
                <SkipForward size={26} />
              </button>
            </div>


              <audio
                ref={audioRef}
                src={audioUrl || undefined}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                onEnded={() => setPlaying(false)}
                className="hidden"
              />
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="text-primary-900"
                  aria-label={playing ? "Pause audio" : "Play audio"}
                >
                  {playing ? <Pause size={22} /> : <Play size={22} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.01"
                  value={currentTime}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (!audioRef.current) return;
                    audioRef.current.currentTime = value;
                    setCurrentTime(value);
                  }}
                  className="w-full accent-primary-700"
                />
                <span className="text-xs text-primary-500 min-w-[76px] text-right">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

            <button onClick={handleUploadAudio} disabled={submitting || !audioBlob || recording}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {submitting ? <Spinner size="sm" /> : <CheckCircle2 size={15} />}
              {submitting ? "Uploading..." : "Upload Recording"}
            </button>
          </div>
        </div>
      </div>

        <div className="fixed bottom-0 left-0 right-0 bg-primary-700 border-t border-primary-800 z-30 md:hidden">
          <div className="max-w-5xl mx-auto h-20 px-4 flex items-center justify-center gap-10 md:gap-14">
          <button
            type="button"
            onClick={() => prevTask ? navigate(`/user/tasks/${prevTask._id}`) : toast("This is the first task")}
              className="w-12 h-12 rounded-full bg-white text-primary-700 flex items-center justify-center disabled:opacity-40"
            disabled={!prevTask}
            aria-label="Previous task"
          >
            <SkipBack size={28} />
          </button>

          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition ${recording ? "bg-red-500 animate-pulse" : "bg-white"}`}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            {recording ? <Square size={22} className="text-white" /> : <Mic size={24} className="text-primary-700" />}
          </button>

          <button
            type="button"
            onClick={() => nextTask ? navigate(`/user/tasks/${nextTask._id}`) : toast("You are on the last task")}
            className="w-12 h-12 rounded-full bg-white text-primary-700 flex items-center justify-center disabled:opacity-40"
            disabled={!nextTask}
            aria-label="Next task"
          >
            <SkipForward size={28} />
          </button>
        </div>
      </div>
      </div>
    </UserLayout>
  );
}
