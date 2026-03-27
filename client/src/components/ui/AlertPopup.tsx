import { X } from "lucide-react";


interface AlertPopupProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  children: React.ReactNode;
  title?: string;
}

export const AlertPopup = ({ isOpen, onClose, message, title, children }: AlertPopupProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-60">
      <div className="bg-surface w-100 rounded-xl shadow-lg p-6 relative">
        <span
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          <X />
        </span>
        {title && <p className="text-center text-primary text-2xl font-bold mt-10">{title || "Title"}</p>}
        {message && <p className="text-lg text-center font-medium text-gray-800">
          {message}
        </p>}
        <div className="mt-6 flex gap-4 text-right">
          {children}
        </div>
      </div>
    </div>
  );
};
