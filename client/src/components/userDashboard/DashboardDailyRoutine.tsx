import { ChevronRight, Sparkles, CheckSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { format12h } from "../../utils/format12h";
import { useNavigate } from "react-router";
import type { Habit } from "../studyPlanner/TrackerGrid";
// import { Exam, Habit } from "../../types/types";

export const DashboardDailyRoutine = ({ targetedExams, dailyRituals, progress, today, handleToggle, isOpen, onClose }: { targetedExams: any, dailyRituals: Habit[], progress: Record<string, boolean[]>, today: number, handleToggle: (id: string) => void, isOpen: boolean, onClose: () => void }) => {
    const [selectedExamInDrawer, setSelectedExamInDrawer] = useState<string | null>(null);
    const navigate = useNavigate();

    const filteredRitualsInDrawer = useMemo(() => {
        if (!selectedExamInDrawer) return dailyRituals;
        return dailyRituals.filter(h => !h.exam_id || h.exam_id === selectedExamInDrawer);
    }, [dailyRituals, selectedExamInDrawer]);

    return (
        <div
            className={`fixed inset-0 z-60 transition-all duration-700 ease-botanical ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
            <div
                className="absolute inset-0 bg-on-surface/5 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className={`absolute top-0 right-0 h-full w-full max-w-96 bg-surface-container-high/95 backdrop-blur-3xl shadow-ambient-lg border-l border-on-surface/5 px-4 py-10 transform transition-transform duration-700 ease-botanical ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter text-on-surface leading-none">Daily Routine</h3>
                        <p className="text-[10px] font-technical font-black uppercase tracking-widest text-primary mt-2">Active Cycle: {new Date().toLocaleString('default', { month: 'long' })}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-10 rounded-full bg-on-surface/5 flex items-center justify-center hover:bg-on-surface/10 transition-colors"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto custom-scrollbar-hide mb-8 p-1">
                    <button
                        onClick={() => setSelectedExamInDrawer(null)}
                        className={`px-4 py-2 rounded-full font-technical font-black text-[9px] uppercase tracking-widest transition-all ${!selectedExamInDrawer ? "bg-primary text-white shadow-md" : "bg-on-surface/5 text-on-surface opacity-60 hover:opacity-100"
                            }`}
                    >
                        All
                    </button>
                    {targetedExams.map((ex: any) => (
                        <button
                            key={ex.id}
                            onClick={() => setSelectedExamInDrawer(ex.id)}
                            className={`px-4 py-2 rounded-full font-technical font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedExamInDrawer === ex.id ? "bg-primary text-white shadow-md" : "bg-on-surface/5 text-on-surface opacity-60 hover:opacity-100"
                                }`}
                        >
                            {ex.name}
                        </button>
                    ))}
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar pr-5">
                    {filteredRitualsInDrawer.length === 0 ? (
                        <div className="py-12 text-center bg-white/40 rounded-4xl border border-dashed border-primary/20 p-8">
                            <Sparkles className="size-8 text-primary/40 mx-auto mb-4" />
                            <div className="space-y-2">
                                <p className="text-xs font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-60 px-4">
                                    No task is added for this month.<br />
                                </p>
                                <p className="text-sm font-black text-on-surface">Please go to study planner.</p>
                            </div>
                        </div>
                    ) : (
                        filteredRitualsInDrawer.map((habit) => {
                            const isDone = progress[habit.id]?.[today - 1];
                            return (
                                <label
                                    key={habit.id}
                                    className={`flex items-center gap-5 px-3 py-3 rounded-4xl cursor-pointer transition-all duration-500 hover:scale-[1.02] ${!isDone
                                        ? "bg-white shadow-sm ring-1 ring-primary/5"
                                        : "bg-surface-container-high/40 opacity-60 grayscale"
                                        }`}
                                >
                                    <div className="relative size-6 shrink-0">
                                        <input
                                            className="peer hidden"
                                            type="checkbox"
                                            checked={isDone || false}
                                            onChange={() => handleToggle(habit.id)}
                                        />
                                        <div className="size-full rounded-lg border-2 border-primary/20 flex items-center justify-center transition-all peer-checked:bg-primary peer-checked:border-primary peer-checked:rotate-0 rotate-45">
                                            {isDone && <CheckSquare className="size-4 text-white" strokeWidth={3} />}
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-black tracking-tight ${isDone ? "line-through opacity-40" : "text-on-surface"}`}>
                                            {habit.name}
                                        </span>
                                        {habit.start_time && (
                                            <span className="text-[9px] font-technical font-black text-primary opacity-60">
                                                {format12h(habit.start_time)}
                                            </span>
                                        )}
                                    </div>
                                </label>
                            );
                        })
                    )}
                </div>

                <div className="absolute bottom-10 left-10 right-10">
                    <button
                        onClick={() => { onClose(); navigate(`../plan-study/${selectedExamInDrawer || dailyRituals[0]?.exam_id}`); }}
                        className="w-full py-4 bg-primary text-on-primary rounded-full font-technical font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        Open Master Planner
                    </button>
                </div>
            </div>
        </div>
    )
}