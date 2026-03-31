import { forwardRef, type InputHTMLAttributes } from "react";

interface multiSelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  children: any;
  id: string;
  ref: any;
  label:string;
}

export const MultiSelect = forwardRef<HTMLSelectElement, multiSelectProps>(
  ({ children,label, ...props }, ref) => {
    return (
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
        <select className="focus:outline-0 px-4  py-3 rounded-lg" ref={ref} {...props}>
          {children}
        </select>
      </div>
    );
  },
);
