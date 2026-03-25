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
        <div className="md:col-span-6 bg-[#efeee3] p-8 rounded-2xl shadow-sm border border-[#efeee3] hover:border-[#1a57db]/10 transition-all">
            <h3 className="text-xl font-black text-gray-900 mb-8 tracking-tight flex items-center gap-3">
                <Target className="text-green-700" size={24} />
                Subject Mastery
            </h3>
            {displayData?.length > 0 ? (
                displayData?.slice(0, 5).map((s: any, i: number) => (
                    <div key={i} className="mb-6 last:mb-0">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-gray-700">{s.name || s.subject}</span>
                            <span className="text-sm font-black text-green-700">{(s.mastery_level || s.accuracy)}%</span>
                        </div>
                        <div className="h-3 bg-gray-200/50 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-linear-to-r from-green-600 to-green-700 rounded-full transition-all duration-1000 ease-out shadow-lg"
                                style={{ width: `${(s.mastery_level || s.accuracy)}%` }}
                            />
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                    <p className="text-gray-500 text-sm font-bold animate-pulse italic">Complete tests to unlock subject analysis.</p>
                </div>
            )}
        </div>
    )
}

export default SubjectMastery;
