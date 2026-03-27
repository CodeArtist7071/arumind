import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  className?: any;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ title, className, ...props }, ref) => {
    return (
      <button
        {...props}
        ref={ref}
        className={
          `w-full cursor-pointer disabled:opacity-50 transition-all duration-500
            bg-linear-to-r from-primary to-primary-container text-on-primary
            flex justify-center py-4 px-8 rounded-full shadow-lg shadow-primary/20
            text-[11px] font-technical font-black uppercase tracking-[0.2em] transform hover:scale-[1.02] active:scale-[0.98]
            focus:outline-none focus:ring-4 focus:ring-primary/10 ` + className
        }
      >
        {title}
      </button>
    );
  },
);
