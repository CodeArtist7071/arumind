import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  className?: any;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ title, className, ...props }) => {
    return (
      <button
        {...props}
        className={
          className +
          ` w-full cursor-pointer disabled:bg-gray-500 bg-blue-600 text-white flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors`
        }
      >
        {title}
      </button>
    );
  },
);
