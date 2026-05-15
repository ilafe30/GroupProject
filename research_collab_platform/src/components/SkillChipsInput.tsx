import { Plus, X } from "lucide-react";

type SkillChipsInputProps = {
  label: string;
  hint?: string;
  chips: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (skill: string) => void;
  disabled?: boolean;
  addLabel?: string;
};

export function SkillChipsInput({
  label,
  hint,
  chips,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
  disabled,
  addLabel = "Add skill",
}: SkillChipsInputProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">{label}</label>
        {hint && <p className="text-xs text-[#5b86a2] mt-1 pl-1">{hint}</p>}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0e4971]/15 bg-[#0e4971]/5 px-3 py-1.5 text-sm font-semibold text-[#0e4971]"
            >
              {skill}
              <button
                type="button"
                onClick={() => onRemove(skill)}
                disabled={disabled}
                className="text-[#5b86a2] hover:text-[#0e4971] disabled:opacity-50 p-0.5 rounded-full"
                aria-label={`Remove ${skill}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          disabled={disabled}
          placeholder="Type one skill, then Add"
          className="flex-1 bg-[#f8f7f4] border border-[#0e4971]/5 rounded-2xl py-3 px-4 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#0e4971]/15 bg-white px-5 py-3 text-sm font-bold text-[#0e4971] hover:bg-[#f8f7f4] disabled:opacity-50 shrink-0"
        >
          <Plus size={16} />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
