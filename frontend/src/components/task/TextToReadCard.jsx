import { useState } from "react";
import { Languages } from "lucide-react";

/**
 * Generic "Text to Read" card used by every task type except Chinese Read:
 * shows the task's text, with a language-variant switcher when the task has any.
 */
export default function TextToReadCard({ task }) {
  const [selectedLanguage, setSelectedLanguage] = useState("default");

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
  );
}
