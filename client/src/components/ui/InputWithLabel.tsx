import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  element?: string;
  error?: any;
  icon?: React.ReactNode;
  labelIcon?: React.ReactNode;
}

export const InputWithLabel = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, element, icon, error, labelIcon, ...props }, ref) => {
    console.log("inputErrors",error);
    return (
      <div>
        <div className="flex justify-between items-center">
          <label
            htmlFor={id}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>

          {element && <span>{element}</span>}
        </div>

        <div className="relative flex border px-4 items-center rounded-lg border-slate-300 dark:border-slate-700 transition-all">
          {labelIcon}

          <input
            ref={ref}
            id={id}
            className="block w-full focus:outline-0 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 py-3 px-4"
            {...props}
          />

          {icon}
        </div>

        {error && (
          <p className="text-sm mt-2 text-red-500">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);