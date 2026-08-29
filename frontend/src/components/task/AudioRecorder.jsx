import { useEffect, useRef, useState } from "react";
import { Mic, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { streamAudio, uploadAudio } from "../../api/user.api";
import toast from "react-hot-toast";

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

/**
 * Shared audio recorder used by every task type: record/stop, play back the
 * recording (or the previously submitted audio), and step to the prev/next
 * task in the project, uploading in the background when moving forward with
 * an unsaved recording.
 */
export default function AudioRecorder({ task, taskId, prevTask, nextTask, onNavigate, onAfterUpload, onSubmittingChange }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const recordingStartedAtRef = useRef(null);
  const recordingTickerRef = useRef(null);

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  // Load the recorded/submitted audio whenever the task changes, and clear local state.
  useEffect(() => {
    let cancelled = false;
    const hasAudio = Boolean(task?.audio?.publicId || task?.audio?.url);

    (async () => {
      if (hasAudio) {
        try {
          const response = await streamAudio(taskId);
          if (cancelled) return;
          const url = URL.createObjectURL(response.data);
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } catch {
          if (!cancelled) {
            setAudioUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          }
        }
      } else {
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
      if (!cancelled) {
        setAudioBlob(null);
        setPlaying(false);
        setCurrentTime(0);
      }
    })();

    return () => { cancelled = true; };
  }, [taskId, task?.audio?.publicId, task?.audio?.url]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (recording) {
      if (!recordingStartedAtRef.current) {
        recordingStartedAtRef.current = Date.now();
      }
      recordingTickerRef.current = window.setInterval(() => {
        setRecordingElapsed(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
      }, 250);
    } else if (recordingTickerRef.current) {
      window.clearInterval(recordingTickerRef.current);
      recordingTickerRef.current = null;
    }

    return () => {
      if (recordingTickerRef.current) {
        window.clearInterval(recordingTickerRef.current);
        recordingTickerRef.current = null;
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingElapsed(0);
      recordingStartedAtRef.current = Date.now();
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

  const renderRecordingWave = () => (
    <div className="recording-wave" aria-hidden="true">
      <span className="recording-wave__bar" />
      <span className="recording-wave__bar" />
      <span className="recording-wave__bar" />
      <span className="recording-wave__bar" />
      <span className="recording-wave__bar" />
    </div>
  );

  const uploadRecordedAudio = async ({ background = false } = {}) => {
    if (recording) {
      toast.error("Stop recording before submitting.");
      return false;
    }
    if (!audioBlob) {
      toast.error("Please record audio first.");
      return false;
    }

    const blob = audioBlob;
    const displayTaskId = task.taskId;
    const file = new File([blob], `${displayTaskId}.wav`, { type: "audio/wav" });
    const performUpload = async () => {
      await uploadAudio(taskId, file);
      await onAfterUpload?.({ background });
    };

    if (background) {
      setAudioBlob(null);
      audioRef.current?.pause();
      setPlaying(false);
      setCurrentTime(0);
      setAudioUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });

      performUpload()
        .then(() => toast.success(`Audio submitted for ${displayTaskId}.`))
        .catch((err) => toast.error(err.response?.data?.message || `Submission failed for ${displayTaskId}`));

      return true;
    }

    setSubmitting(true);
    try {
      await performUpload();
      toast.success("Audio submitted successfully!");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!nextTask) {
      toast("You are on the last task");
      return;
    }
    if (recording) {
      toast.error("Stop recording before moving to next task.");
      return;
    }
    if (audioBlob) {
      const backgroundStarted = await uploadRecordedAudio({ background: true });
      if (!backgroundStarted) return;
      toast("Uploading audio in background. Moving to next task...");
      onNavigate(nextTask._id);
      return;
    }
    if (task.audio?.publicId || task.audio?.url) {
      onNavigate(nextTask._id);
      return;
    }
    toast.error("Please record audio first. Use Skip if you want to continue without submitting.");
  };

  const handlePrev = () => {
    if (prevTask) onNavigate(prevTask._id);
    else toast("This is the first task");
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !audioUrl) {
      toast.error("No recorded audio available.");
      return;
    }
    try {
      if (playing) audioRef.current.pause();
      else await audioRef.current.play();
      setPlaying((prev) => !prev);
    } catch {
      toast.error("Unable to play audio.");
    }
  };

  // Shared control row (rewind / record / next) — rendered once for the desktop bar
  // and once for the fixed mobile bottom bar, sized differently but never duplicated in logic.
  const renderControlRow = (size) => (
    <>
      <button
        type="button"
        onClick={handlePrev}
        className="w-12 h-12 rounded-full bg-white text-primary-700 flex items-center justify-center disabled:opacity-40"
        disabled={!prevTask}
        aria-label="Previous task"
      >
        <SkipBack size={size} />
      </button>

      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition ${recording ? "bg-red-500 animate-pulse" : "bg-white"}`}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        {recording ? renderRecordingWave() : <Mic size={24} className="text-primary-700" />}
      </button>

      <button
        type="button"
        onClick={handleNext}
        className="w-12 h-12 rounded-full bg-white text-primary-700 flex items-center justify-center disabled:opacity-40"
        disabled={!nextTask || submitting}
        aria-label="Next task"
      >
        <SkipForward size={size} />
      </button>
    </>
  );

  return (
    <>
      <div className="card">
        <p className="label mb-3">Recording Status</p>
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm text-slate-400">
            {recording ? "Recording in progress..." : audioBlob ? "New recording ready to upload." : "Use recorder controls below."}
          </p>
          {recording && (
            <span className="shrink-0 rounded-md bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1">
              {formatTime(recordingElapsed)}
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center justify-between rounded-2xl bg-primary-700 px-5 py-4 mb-4">
          {renderControlRow(26)}
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

        <div className="text-xs text-black/70">
          Use Next in the recorder controls to auto-submit your recording and move to the next task.
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-primary-700 border-t border-primary-800 z-30 md:hidden">
        <div className="max-w-5xl mx-auto h-20 px-4 flex items-center justify-center gap-10 md:gap-14">
          {renderControlRow(28)}
        </div>
      </div>
    </>
  );
}
