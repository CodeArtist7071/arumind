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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#10170f]/45 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="admin-form-title" className="flex max-h-[min(88vh,800px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#e4e9df] bg-[#fbfcf8] shadow-[0_24px_80px_rgba(14,27,12,0.24)] dark:border-white/10 dark:bg-[#171e17]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e7ebe2] px-5 py-5 dark:border-white/10 sm:px-7">
          <div>
            <h3 id="admin-form-title" className="text-xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4]">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-[#778171] dark:text-[#a6b09f]">
              Complete the details below, then save your changes.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close form"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-[#788473] transition hover:bg-[#edf1e9] hover:text-[#263b22] dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.name} className={`flex flex-col gap-2 ${field.type === "textarea" || (field.type === "select" && field.multiple) ? "sm:col-span-2" : ""}`}>
                  <label htmlFor={`admin-field-${field.name}`} className="flex items-center gap-1.5 text-sm font-medium text-[#34402f] dark:text-[#d6dfd1]">
                    {field.label} {field.required && <span className="text-[#16a34a]">*</span>}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      id={`admin-field-${field.name}`}
                      disabled={field.disabled}
                      {...register(field.name, { required: field.required })}
                      className="min-h-28 rounded-xl border border-[#dfe6d9] bg-white px-3.5 py-3 text-sm text-[#263b22] outline-none transition placeholder:text-[#9aa493] focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 disabled:opacity-50 dark:border-white/10 dark:bg-[#111711] dark:text-[#e8eee4]"
                    />
                  ) : field.type === "select" && field.multiple ? (
                    <Controller
                      name={field.name}
                      control={control}
                      rules={{ required: field.required }}
                      render={({ field: { value, onChange } }) => (
                        <div id={`admin-field-${field.name}`} className="grid grid-cols-1 gap-2 rounded-xl border border-[#e3e9de] bg-white p-3 dark:border-white/10 dark:bg-[#111711] sm:grid-cols-2">
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
                                className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                                  isSelected
                                    ? "border-[#7ba36e] bg-[#edf4e9] text-[#285922] dark:bg-[#263d24] dark:text-[#d8efd0]"
                                    : "border-transparent bg-[#f7f9f5] text-[#687565] hover:bg-[#edf3e9] dark:bg-white/[0.04] dark:text-[#aeb9aa]"
                                }`}
                              >
                                <div className={`grid size-4 shrink-0 place-items-center rounded border transition ${
                                    isSelected ? "border-[#548348] bg-[#548348] text-white" : "border-[#cbd4c5] bg-white dark:border-white/20 dark:bg-[#151c15]"
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
                      id={`admin-field-${field.name}`}
                      disabled={field.disabled}
                      {...register(field.name, { required: field.required })}
                      className="min-h-11 rounded-xl border border-[#dfe6d9] bg-white px-3.5 text-sm text-[#263b22] outline-none transition focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 disabled:opacity-50 dark:border-white/10 dark:bg-[#111711] dark:text-[#e8eee4]"
                    >
                      <option value="">Select option...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <div className="flex items-center gap-4 py-3">
                      <input
                        id={`admin-field-${field.name}`}
                        type="checkbox"
                        {...register(field.name)}
                        className="size-4 rounded border-[#cbd4c5] text-[#315f29] focus:ring-[#7ba36e]"
                      />
                      <label htmlFor={`admin-field-${field.name}`} className="text-sm text-[#687565] dark:text-[#aeb9aa]">
                        Active Status
                      </label>
                    </div>
                  ) : (
                    <input
                      id={`admin-field-${field.name}`}
                      type={field.type}
                      disabled={field.disabled}
                      {...register(field.name, {
                        required: field.required,
                        valueAsNumber: field.type === "number",
                      })}
                      className="min-h-11 rounded-xl border border-[#dfe6d9] bg-white px-3.5 text-sm text-[#263b22] outline-none transition focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 disabled:opacity-50 dark:border-white/10 dark:bg-[#111711] dark:text-[#e8eee4]"
                    />
                  )}
                  {errors[field.name] && (
                    <span role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                       This field is required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#e7ebe2] bg-[#f6f8f3] px-5 py-4 dark:border-white/10 dark:bg-[#141a14] sm:px-7">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-lg px-4 text-sm font-medium text-[#687565] transition hover:bg-[#e9eee5] hover:text-[#263b22] dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex min-h-10 items-center gap-2 rounded-lg bg-[#24551e] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#173f19] active:scale-[0.98] disabled:opacity-50"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
