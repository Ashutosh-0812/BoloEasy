import { useState } from "react";
import toast from "react-hot-toast";
import { updatePinyinScript } from "../../api/user.api";

/**
 * Chinese Read task content: a read-only Chinese Script card next to an
 * editable Pinyin Script card. The Save button only appears once the typed
 * value diverges from what's stored on the task, and hides again once saved
 * (or once retyped back to match).
 */
export default function ChineseReadCard({ task, onTaskUpdate }) {
  const [pinyinDraft, setPinyinDraft] = useState(task.pinyinScript || "");
  const [saving, setSaving] = useState(false);

  const pinyinDirty = pinyinDraft !== (task.pinyinScript || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePinyinScript(task._id, pinyinDraft);
      onTaskUpdate({ pinyinScript: pinyinDraft });
      toast.success("Pinyin script saved.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save pinyin script.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="card bg-slate-50 border border-slate-200">
        <p className="label text-primary-400 mb-3">Chinese Script</p>
        <p className="text-primary-900 text-lg font-medium leading-relaxed whitespace-pre-wrap break-all">{task.text}</p>
      </div>

      <div className="card bg-slate-50 border border-slate-200">
        <p className="label text-primary-400 mb-3">Pinyin Script</p>
        <textarea
          className="input resize-none"
          rows={6}
          value={pinyinDraft}
          onChange={(e) => setPinyinDraft(e.target.value)}
          placeholder="Enter the pinyin transliteration…"
          maxLength={5000}
        />
        {pinyinDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary mt-3"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
