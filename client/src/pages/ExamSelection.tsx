import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { fetchExams } from "../slice/examSlice";
import { supabase } from "../utils/supabase";
import { Button } from "../components/ui/Button";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { SearchBar } from "../components/ui/SearchBar";

export default function ExamGoalSelection() {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { examData } = useSelector((state: RootState) => state.exams);

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchExams());
  }, [dispatch]);

  const handleSaveExams = async () => {

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      target_exams: selected,
      user_selected:true,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error saving exams", error);
  } else {
    console.log("Exams saved successfully");
    navigate("/user/dashboard")
  }

};

  const toggleExam = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };
 console.log(selected);
  /* FILTERED EXAMS */
  const filteredExams = examData.filter(
    (exam) =>
      exam.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.full_name.toLowerCase().includes(search.toLowerCase()),
  ).sort((a, b) => {
    const aSelected = selected.includes(a.id);
    const bSelected = selected.includes(b.id);

    if (aSelected === bSelected) return 0;
    return aSelected ? -1 : 1;
  });

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
      <div className="fixed top-0 right-0 -z-10 opacity-20 pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 blur-[120px] -mr-40 -mt-40"></div>
      </div>
      <div className="flex-1 flex flex-col max-w-[960px] mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 py-6">
          <div className="flex items-center gap-3">
            <div className="text-primary">
              <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <h1 className="text-xl font-bold tracking-tight">
              ExamPrep Odisha
            </h1>
          </div>

          <button className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            🔔
          </button>
        </header>

        {/* TITLE */}
        <h2 className="text-2xl font-bold mt-6">Select Your Goals</h2>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Choose the examination boards you are preparing for.
        </p>
        <SearchBar value={search} onChange={(e) => setSearch(e.target.value)}/>

        {/* EXAM CARDS */}
        <div className="mt-8 space-y-4 pb-32">
          {filteredExams.length === 0 && (
            <p className="text-slate-500">No exams found.</p>
          )}

          {filteredExams.map((exam) => {
            const isSelected = selected.includes(exam.id);

            return (
              <label
                key={exam.id}
                className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition
                ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleExam(exam.id)}
                  className="w-6 h-6 text-primary border-slate-300 rounded"
                />

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">
                      {exam.name}
                      <span className="text-sm font-medium ml-1">
                        ({exam.full_name})
                      </span>
                    </h3>

                    <span className="text-slate-400">
                      <CheckCircle />
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {exam.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ACTION BUTTON */}
      <div className="fixed bottom-10 right-5">
        <Button onClick={handleSaveExams} title="Proceed to The Dashboard" />
      </div>
      <div className="fixed bottom-0 left-0 -z-10 opacity-20 pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 blur-[120px] -mr-40 -mt-40"></div>
      </div>
    </div>
  );
}
