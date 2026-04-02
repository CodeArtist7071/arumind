import React from "react";
import { useForm, Controller } from "react-hook-form";
import { X, Save, Check } from "lucide-react";

interface Field {
  name: string;
  label: string;
  type: "text" | "number" | "checkbox" | "textarea" | "select";
  options?: { label: string; value: any }[];
  required?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  defaultValue?: any;
}

interface AdminFormModalProps {
  title: string;
  fields: Field[];
  initialData?: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

/**
 * A dynamic form manifestation for editing and creating core admin records.
 * Optimized for high-reliability CRUD and relational synchronization.
 */
export const AdminFormModal: React.FC<AdminFormModalProps> = ({
  title,
  fields,
  initialData,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: initialData || {},
  });

  // Orchestrate hard-reset manifestation whenever the modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialData && Object.keys(initialData).length > 0) {
        // Strip technical metadata for form mapping
        const { id, created_at, updated_at, ...editableData } = initialData;
        reset(editableData);
      } else {
        // Enforce a clinical reset with technical default manifestations
        const defaults: any = {};
        fields.forEach(f => { if (f.defaultValue !== undefined) defaults[f.name] = f.defaultValue; });
        reset(defaults);
      }
    }
  }, [isOpen, reset, initialData, fields]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-[#16a34a]/10 overflow-hidden">
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
              {title}
            </h3>
            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#16a34a] mt-1">
              Technical Specification Modification
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-8">
            <div className="grid grid-cols-1 gap-8">
              {fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
                    {field.label} {field.required && <span className="text-[#16a34a]">*</span>}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      disabled={field.disabled}
                      {...register(field.name, { required: field.required })}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-6 py-5 text-sm font-medium border border-slate-200/50 dark:border-slate-700/30 focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] focus:bg-white outline-none transition-all min-h-[140px] disabled:opacity-50"
                    />
                  ) : field.type === "select" && field.multiple ? (
                    <Controller
                      name={field.name}
                      control={control}
                      rules={{ required: field.required }}
                      render={({ field: { value, onChange } }) => (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200/50 dark:border-slate-800">
                          {field.options?.map((opt) => {
                            const isSelected = Array.isArray(value) && value.includes(opt.value);
                            return (
                              <button
                                type="button"
                                key={opt.value}
                                onClick={() => {
                                  const newValue = Array.isArray(value) ? [...value] : [];
                                  if (isSelected) {
                                    onChange(newValue.filter((v) => v !== opt.value));
                                  } else {
                                    onChange([...newValue, opt.value]);
                                  }
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                                  isSelected
                                    ? "bg-[#16a34a] text-white border-[#16a34a] shadow-lg shadow-[#16a34a]/20 scale-[1.02]"
                                    : "bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-[#16a34a]/30"
                                }`}
                              >
                                <div className={`size-4 rounded-md border flex items-center justify-center transition-all ${
                                    isSelected ? "bg-white/20 border-white" : "bg-slate-50 border-slate-200"
                                }`}>
                                    {isSelected && <Check size={10} strokeWidth={4} />}
                                </div>
                                <span className="truncate">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    />
                  ) : field.type === "select" ? (
                    <select
                      disabled={field.disabled}
                      {...register(field.name, { required: field.required })}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-6 py-5 text-sm font-medium border border-slate-200/50 dark:border-slate-700/30 focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] focus:bg-white outline-none transition-all cursor-pointer h-[60px] appearance-none disabled:opacity-50"
                    >
                      <option value="">Select manifestation...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <div className="flex items-center gap-4 py-3">
                      <input
                        type="checkbox"
                        {...register(field.name)}
                        className="w-6 h-6 rounded-xl text-[#16a34a] focus:ring-[#16a34a] cursor-pointer"
                      />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Active Lattice Node
                      </span>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      disabled={field.disabled}
                      {...register(field.name, {
                        required: field.required,
                        valueAsNumber: field.type === "number",
                      })}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-6 py-5 text-sm font-medium border border-slate-200/50 dark:border-slate-700/30 focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a] focus:bg-white outline-none transition-all h-[60px] disabled:opacity-50"
                    />
                  )}
                  {errors[field.name] && (
                    <span className="text-[10px] text-red-500 font-black uppercase tracking-widest pl-2">
                       Verification Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-6 px-10 py-8 border-t border-slate-100 dark:border-slate-800/50 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all font-mono"
            >
              / Cancel Request
            </button>
            <button
              type="submit"
              className="flex items-center gap-4 px-10 py-5 text-[11px] font-black uppercase tracking-widest bg-[#16a34a] text-white rounded-2xl shadow-2xl shadow-[#16a34a]/30 hover:shadow-[#16a34a]/50 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={18} />
              Save Manifestation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
