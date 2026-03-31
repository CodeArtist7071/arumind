import { Target } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchExamSubjects } from "../../slice/examSubjectSlice";
import type { AppDispatch, RootState } from "../../store";

const SubjectMastery = ({ examid, metrics }: { examid?: string, metrics: any }) => {
    const { data } = useSelector((state: RootState) => state.examSubject.e_data ?? []);
    const dispatch = useDispatch<AppDispatch>();
    console.log("data....", examid)
    useEffect(() => {
        if (examid) {
            dispatch(fetchExamSubjects(examid));
        }
    }, [examid, dispatch])


    const displayData = data?.length > 0 ? data : (metrics?.subjectBreakdown || []);

    return (
        <div className="bg-surface-container-high p-10 rounded-[3rem] shadow-ambient">
            <h3 className="text-xl font-black text-on-surface mb-10 tracking-tight flex items-center gap-4">
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                   <Target size={20} />
                </div>
                Subject Mastery
            </h3>
            {displayData?.length > 0 ? (
                <div className="space-y-8">
                    {displayData?.slice(0, 5).map((s: any, i: number) => (
                        <div key={i} className="group">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity">
                                    {s.name || s.subject}
                                </span>
                                <span className="text-sm font-technical font-black text-primary tracking-tighter">
                                    {(s.mastery_level || s.accuracy)}%
                                </span>
                            </div>
                            <div className="h-4 bg-on-surface/5 rounded-full overflow-hidden relative border border-outline-variant/5 shadow-inner">
                                <div
                                    className="h-full bg-linear-to-r from-primary to-primary-container rounded-full transition-all duration-1000 ease-out shadow-sm relative"
                                    style={{ width: `${(s.mastery_level || s.accuracy)}%` }}
                                >
                                   <div className="absolute inset-0 bg-white/10 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-on-surface/5 rounded-4xl border border-dashed border-outline-variant/20 opacity-40">
                    <p className="text-on-surface-variant text-xs font-black uppercase tracking-widest italic animate-pulse">
                        Complete tests to cultivate analysis.
                    </p>
                </div>
            )}
        </div>
    )
}

export default SubjectMastery;
