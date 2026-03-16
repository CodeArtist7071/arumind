import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getExamSubjects } from "../services/examService";
import { useDispatch, useSelector } from "react-redux";
import { fetchExamSubjects } from "../slice/examSubjectSlice";
import type { AppDispatch, RootState } from "../store";
import { BookCopy } from "lucide-react";
import { fetchChapter } from "../slice/chapterSlice";
import { useNotifications } from "reapop";

const Exam = () => {
  const { eid } = useParams<{ eid: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const {notify} = useNotifications();

  // ✅ useSelector MUST be here (top level)
  const { data, e_data, loading, error } = useSelector(
    (state: RootState) => state.examSubject ?? null,
  );

  //   const {
  //     data: chapterData,
  //     loading: chapterLoading,
  //     error: chapterError,
  //   } = useSelector((state: RootState) => state.chapters ?? null);

  useEffect(() => {
    if (eid) {
      dispatch(fetchExamSubjects(eid));
    }
  }, [dispatch, eid]);

  function handleButton(sid: string, cid: string) {
    navigate(`test/${sid}/${cid}`);
  }

  console.log("Redux Data:", data);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="max-w-300 mx-auto w-full px-4 py-6 md:px-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Subject-wise Curriculum</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Target your weak areas and track your progress across all OSSC CGL
            subjects.
          </p>
        </div>

        {data.map((subject: any, index: number) => {
          console.log("is exam id true...", subject.subjects.exam_subjects);
          if (subject.exam_id === eid)
            return (
              <section
                key={index}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600 text-2xl">
                        <BookCopy />
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {subject.subjects.name}
                      </h2>
                      <p className="text-sm w-90 text-slate-500 truncate">
                        {subject.subjects.description}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-[140px]">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-primary">Progress</span>
                      <span>4 / 12 Chapters</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: "33%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Chapter Items */}
                {e_data.map((item, idx) => {
                  // Check if chapter belongs to current subject
                  if (subject.subjects.id === item.subjects.id) {
                    return (
                      <div
                        key={idx}
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      >
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <span className="text-xs text-slate-400">
                            Completed 2 days ago
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleButton(item.subjects.id, item.id)
                          }
                          className="px-4 py-2 border bg-blue-600 text-white cursor-pointer hover:text-blue-400 hover:border-slate-400 rounded-lg text-sm font-semibold hover:bg-slate-200"
                        >
                          Retake
                        </button>
                      </div>
                    );
                  }
                  return null; // don't forget this for map
                })}
              </section>
            );
        })}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 px-4 md:px-10">
        <div className="max-w-300 mx-auto text-sm text-slate-500">
          © 2024 OSSC CGL Prep. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Exam;
