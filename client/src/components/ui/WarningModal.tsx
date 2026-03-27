import { AlertTriangle, X } from "lucide-react";

interface AlertPopupProps {
  isOpen: boolean;
  onClose?: () => void;
  message?: string;
  children?: React.ReactNode;
  title?: string;
}

export const WarningModal = ({
  isOpen,
  onClose,
  message,
  title = "helloo..",
  children,
}: AlertPopupProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-60">
      <div className="bg-surface w-100 rounded-xl shadow-lg  relative">
        <div className="bg-amber-200 rounded-t-xl rounded-r-xl h-30 flex justify-center items-center">
          <span className="bg-surface rounded-full w-20 h-20 flex justify-center items-center">
            <AlertTriangle className="w-9 h-9 text-center text-amber-400" />
          </span>
        </div>

          <p className="text-center text-2xl text-black font-bold mt-10">
            Cheating Alert
          </p>
        
        <p className="text-sm px-4 text-center mt-5 font-medium text-gray-800">
          {message || "Cheating Alert is Detected please dont move your head left or right it will considered as cheating.. and voilate the exam rules.."}
        </p>
        <div className="mt-6 flex gap-4 text-right">{children}</div>
      </div>
    </div>
  );
};
