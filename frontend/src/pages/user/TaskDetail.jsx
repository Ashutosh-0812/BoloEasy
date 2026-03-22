import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import UserLayout from "../../components/layout/UserLayout";
import { getTaskDetail, uploadAudio, submitTranscript } from "../../api/user.api";
import {
  ChevronLeft, Mic, Square, CheckCircle2, Send,
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
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const recognitionBaseRef = useRef("");
  const recognitionFinalRef = useRef("");
  const recordingRef = useRef(false);

  // Transcript
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isLiveRecognitionOn, setIsLiveRecognitionOn] = useState(false);

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
  useEffect(() => { recordingRef.current = recording; }, [recording]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || "";
        if (!chunk) continue;
        if (event.results[i].isFinal) {
          recognitionFinalRef.current += `${chunk} `;
        } else {
          interim += chunk;
        }
      }

      const combined = `${recognitionBaseRef.current}${recognitionFinalRef.current}${interim}`.trim();
      setTranscript(combined);
    };

    recognition.onstart = () => {
      setIsLiveRecognitionOn(true);
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast.error("Live transcript permission denied by browser.");
        } else {
          toast.error("Live transcript stopped. Check browser support and microphone permissions.");
        }
      }
      setIsLiveRecognitionOn(false);
    };

    recognition.onend = () => {
      // Some browsers end recognition automatically; keep it running during active recording.
      if (recordingRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // No-op: if restart fails, we just show inactive state.
        }
      }
      setIsLiveRecognitionOn(false);
    };

    recognitionRef.current = recognition;
    setIsSpeechSupported(true);

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const startLiveTranscript = () => {
    if (!recognitionRef.current || !isSpeechSupported) return;
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      toast.error("Live transcript requires HTTPS (or localhost). ");
      return;
    }
    recognitionBaseRef.current = transcript.trim() ? `${transcript.trim()} ` : "";
    recognitionFinalRef.current = "";
    try {
      recognitionRef.current.start();
    } catch {
      toast.error("Could not start live transcript in this browser.");
    }
  };

  const stopLiveTranscript = () => {
    recognitionRef.current?.stop();
    setIsLiveRecognitionOn(false);
  };

  // ─── Recording ───────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      startLiveTranscript();
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

      if (!isSpeechSupported) {
        toast("Live transcript is not supported in this browser.");
      }
    } catch {
      stopLiveTranscript();
      toast.error("Microphone access denied. Please allow mic access.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
    stopLiveTranscript();
  };

  // ─── Final Submission ───────────────────────────────────────────────────────
  const handleSubmitTask = async () => {
    if (recording) {
      toast.error("Stop recording before submitting.");
      return;
    }

    if (!audioBlob && !(task?.audio?.publicId || task?.audio?.url)) {
      toast.error("Please record audio before submitting.");
      return;
    }

    if (!transcript.trim()) {
      toast.error("Transcript cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      if (audioBlob) {
        const file = new File([audioBlob], `${task.taskId}.wav`, { type: "audio/wav" });
        await uploadAudio(id, file);
      }
      await submitTranscript(id, transcript);
      toast.success("Task submitted successfully!");
      fetchTask();
      setAudioBlob(null);
      setAudioUrl(null);
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
      <Link
        to={task?.projectId ? `/user/projects/${task.projectId}` : "/user"}
        className="flex items-center gap-1.5 text-sm text-black/70 hover:text-black mb-6 transition"
      >
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
                  <div className="flex gap-2 items-center">
                    <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                      className="btn-secondary flex-1 text-center">
                      Re-record
                    </button>
                    <span className="text-xs text-emerald-400">Audio ready for submit</span>
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
            <button onClick={handleSubmitTask} disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {submitting ? <Spinner size="sm" /> : <Send size={15} />}
              {submitting ? "Submitting…" : "Submit Task"}
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
