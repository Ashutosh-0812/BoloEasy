import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import UserLayout from "../../components/layout/UserLayout";
import { getTaskDetail, uploadAudio, submitTranscript } from "../../api/user.api";
import {
  ChevronLeft, Mic, Square, Upload, CheckCircle2, Loader2, Send,
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
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  // Transcript
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTask = () => {
    getTaskDetail(id)
      .then((r) => {
        setTask(r.data.data);
        setTranscript(r.data.data.transcript || "");
      })
      .catch(() => toast.error("Failed to load task"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchTask(); }, [id]);

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
        setAudioUrl(URL.createObjectURL(blob));
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
    if (!audioBlob) return;
    setUploading(true);
    try {
      const file = new File([audioBlob], `${task.taskId}.wav`, { type: "audio/wav" });
      await uploadAudio(id, file);
      toast.success("Audio uploaded to S3 successfully!");
      fetchTask();
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ─── Transcript ───────────────────────────────────────────────────────────────
  const handleSubmitTranscript = async () => {
    if (!transcript.trim()) {
      toast.error("Transcript cannot be empty");
      return;
    }
    setSubmitting(true);
    try {
      await submitTranscript(id, transcript);
      toast.success("Transcript submitted!");
      fetchTask();
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <UserLayout><PageSpinner /></UserLayout>;
  if (!task) return <UserLayout><p className="text-slate-400">Task not found.</p></UserLayout>;

  return (
    <UserLayout>
      <Link to="/user" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to Tasks
      </Link>

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
          {/* Prompt */}
          <div className="card">
            <p className="label mb-2">Prompt</p>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-all">{task.prompt}</p>
          </div>

          {/* Text to read */}
          <div className="card bg-gradient-to-br from-primary-900/30 to-surface-card border-primary-500/20">
            <p className="label mb-3 text-primary-400">Text to Read</p>
            <p className="text-white text-lg font-medium leading-relaxed whitespace-pre-wrap break-all">{task.text}</p>
          </div>

          {/* Audio status */}
          {task.audio?.s3Key && (
            <div className="card border-emerald-500/30">
              <p className="label text-emerald-400 mb-2">Audio Recorded</p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-300 font-medium">Audio uploaded to S3</p>
                  <p className="mt-0.5">{(task.audio.fileSizeBytes / 1024).toFixed(1)} KB · {task.audio.sampleRate} Hz · {task.audio.bitDepth}-bit · Mono</p>
                  <p className="mt-0.5 text-slate-500">{new Date(task.audio.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Record + Transcript */}
        <div className="space-y-4 min-w-0">
          {/* Audio Recorder */}
          <div className="card">
            <p className="label mb-4">Record Audio <span className="normal-case text-slate-500 font-normal">· 16kHz · 16-bit · Mono · PCM WAV</span></p>

            <div className="flex flex-col items-center gap-4">
              {/* Record button */}
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                  ${recording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-500/30"
                    : "bg-primary-600 hover:bg-primary-700 ring-4 ring-primary-500/20"}`}
              >
                {recording ? <Square size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
              </button>
              <p className="text-sm text-slate-400">
                {recording ? <span className="text-red-400 font-medium animate-pulse">● Recording…</span> : "Tap to record"}
              </p>

              {/* Playback */}
              {audioUrl && !recording && (
                <div className="w-full space-y-3">
                  <audio controls src={audioUrl} className="w-full rounded-lg" />
                  <div className="flex gap-2">
                    <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                      className="btn-secondary flex-1 text-center">
                      Re-record
                    </button>
                    <button onClick={handleUploadAudio} disabled={uploading}
                      className="btn-primary flex-1 flex items-center justify-center gap-2">
                      {uploading ? <Spinner size="sm" /> : <Upload size={15} />}
                      {uploading ? "Uploading…" : "Upload to S3"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RSML Transcript */}
          <div className="card">
            <p className="label mb-3">RSML Transcript</p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="input resize-none mb-3"
              rows={5}
              placeholder="Enter the RSML transcript here…&#10;Use @ for named entities, # for variables, ! for emphasis"
            />
            {task.transcript && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-3">
                <CheckCircle2 size={13} /> Transcript previously submitted
              </div>
            )}
            <button onClick={handleSubmitTranscript} disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {submitting ? <Spinner size="sm" /> : <Send size={15} />}
              {submitting ? "Submitting…" : "Submit Transcript"}
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
