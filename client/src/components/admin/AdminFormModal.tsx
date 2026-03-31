import React from "react";
import { useForm } from "react-hook-form";
import { X, Save } from "lucide-react";

interface Field {
  name: string;
  label: string;
  type: "text" | "number" | "checkbox" | "textarea" | "select";
  options?: { label: string; value: any }[];
  required?: boolean;
  multiple?: boolean;
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
    formState: { errors, isDirty },
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
        // Enforce a clinical reset for new manifestations
        reset({});
      }
    }
  }, [isOpen, reset, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex   items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-[#16a34a]/10 overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-[#16a34a] opacity-60">
              Technical Specification Modification
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-6">
            <div className="grid grid-cols-1 gap-6 px-1">
              {fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {field.label} {field.required && "*"}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      {...register(field.name, { required: field.required })}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-5 py-4 text-sm font-medium border border-slate-200/50 dark:border-slate-700/30 focus:ring-2 focus:ring-[#16a34a] focus:bg-white outline-none transition-all min-h-[120px]"
                    />
                  ) : field.type === "select" ? (
                    <select
                      multiple={field.multiple}
                      {...register(field.name, { required: field.required })}
                      className={`bg-slate-50 dark:bg-slate-800/50 rounded-xl px-5 py-4 text-sm font-medium border border-slate-200/50 dark:border-slate-700/30 focus:ring-2 focus:ring-[#16a34a] focus:bg-white outline-none transition-all cursor-pointer ${
                        field.multiple ? "h-40" : "h-14 appearance-none"
                      }`}
                    >
                      {!field.multiple && (
                        <option value="">Select manifestation...</option>
                      )}
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <div className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        {...register(field.name)}
                        className="w-5 h-5 rounded-lg text-[#16a34a] focus:ring-[#16a34a] cursor-pointer"
                      />
                      <span className="text-sm font-medium text-on-surface-variant">
                        Enable Manifestation
                      </span>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      {...register(field.name, {
                        required: field.required,
                        valueAsNumber: field.type === "number",
                      })}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-5 py-4 text-sm font-medium border border-slate-200/50 dark:border-slate-700/30 focus:ring-2 focus:ring-[#16a34a] focus:bg-white outline-none transition-all"
                    />
                  )}
                  {errors[field.name] && (
                    <span className="text-[10px] text-red-500 font-black uppercase tracking-widest pl-1">
                      Value Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-slate-100 dark:border-slate-800/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-widest bg-[#16a34a] text-white rounded-xl shadow-xl hover:shadow-[#16a34a]/40 transition-all active:scale-95 disabled:opacity-50"
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
