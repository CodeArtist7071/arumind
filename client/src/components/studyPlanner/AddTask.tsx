import { X } from "lucide-react";


interface AlertPopupProps {
  isOpen: boolean;
  onClose: () => void;
  register?: any;
  title?: string;
  handleSubmit?: any;
  editingHabitId?: string;
}

export const AddTask = ({ isOpen, onClose, register,handleSubmit,editingHabitId, title}: AlertPopupProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-60">
      <div className="bg-white w-100 rounded-xl shadow-lg p-6 relative">
        <span
          onClick={onClose}
          className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-black"
        >
          <X/>
        </span>
        {title && <p className="text-center text-green-700 text-2xl font-bold mt-10">{title || "Title"}</p>}
        <p className="text-center text-green-700 text-md mt-2">{editingHabitId ? "Kindly update your existing task.." : "Add a new task, and you can also add how much time you want to spend on it."}</p>
        <div className="mt-6 flex gap-4 text-right">
            <div className="p-4 w-full border-t-2 gap-3 items-center">
              <div className="text-left">
                <label className="text-[10px] font-black uppercase text-green-700 mb-1 block">
                  Task Name
                </label>
                <input
                  {...register("habit")}
                  placeholder="Add new task..."
                  className="w-full px-4 py-3 rounded text-green-700 border border-slate-200 text-sm focus:ring-1 ring-[#1a5d1a] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase text-green-700 mb-1 block">
                    Start Time
                  </label>
                  <input
                    type="time"
                    {...register("start_time")}
                    className="w-full px-2 text-green-700 py-3 rounded border border-slate-300 text-xs outline-none"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase text-green-700 mb-1 block">
                    End Time
                  </label>
                  <input
                    type="time"
                    {...register("end_time")}
                    className="w-full px-2 text-green-700 py-3 rounded border border-slate-300 text-xs outline-none"
                  />
                </div>
              </div>
                <div className="w-full text-left mt-4.5">
                    <label htmlFor="priority" className="text-[10px] font-black uppercase text-green-700 mb-1 block">Priority</label>
                  <select
                    {...register("priority")}
                    className="w-full px-4 py-3.5 rounded text-green-700 border border-slate-300 text-[10px] font-black uppercase outline-none"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              <button
                onClick={handleSubmit}
                className="bg-slate-200 w-full text-green-700 cursor-pointer mt-4.5 px-6 py-3.5 rounded text-xs font-black uppercase hover:bg-white transition-colors shadow-sm"
              >
                {editingHabitId ? "Update" : "Add"} Task
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};