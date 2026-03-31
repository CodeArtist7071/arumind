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
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <label
            htmlFor={id}
            className="block text-[10px] font-technical font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60"
          >
            {label}
          </label>

          {element && <span>{element}</span>}
        </div>

        <div className="relative flex bg-surface-container-low items-center rounded-full group focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-500">
          <div className="pl-6 text-on-surface-variant opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all">
            {labelIcon}
          </div>

          <input
            ref={ref}
            id={id}
            className="block w-full bg-transparent text-on-surface placeholder:text-on-surface-variant/30 py-4 px-4 text-sm font-medium focus:outline-none"
            {...props}
          />

          <div className="pr-6">
            {icon}
          </div>
        </div>

        {error && (
          <p className="text-[10px] font-technical font-black uppercase tracking-widest mt-1 ml-6 text-primary animate-reveal">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);
