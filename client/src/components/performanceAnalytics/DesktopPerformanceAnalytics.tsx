import React from "react";
import { TrendingUp, FlaskConical } from "lucide-react";
import { ExamTicker } from "../../components/ui/ExamTicker";
import { GrowthChart } from "../../components/performanceAnalytics/GrowthChart";
import SubjectMastery from "../../components/performanceAnalytics/SubjectMastery";
import { FocusBalance } from "../../components/performanceAnalytics/FocusBalance";
import QuestionDistribution from "../../components/performanceAnalytics/QuestionDistribution";
import AiInsights from "../../components/performanceAnalytics/AiInsights";
import { MastHeadChapters } from "../../components/performanceAnalytics/MastHeadChapters";
import { SoilEnrichment } from "../../components/performanceAnalytics/SoilEnrichment";
import { useNavigate } from "react-router";

interface DesktopPerformanceAnalyticsProps {
  metrics: any;
  selectedExam: string;
  setSelectedExam: (id: string) => void;
  targetedExams: any[];
  chartMode: "Practice" | "Mock";
  setChartMode: (mode: "Practice" | "Mock") => void;
  attempts: any[];
  className?: string;
}

export const DesktopPerformanceAnalytics: React.FC<DesktopPerformanceAnalyticsProps> = ({
  metrics,
  selectedExam,
  setSelectedExam,
  targetedExams,
  chartMode,
  setChartMode,
  attempts,
  className,
}) => {
  const navigate = useNavigate();
  const performanceTrajectory = metrics?.performanceTrajectory || [];
  const maxScore = 100;
  const aiInsights = [
      ...(metrics?.weakChapters?.length > 0 ? [{
        type: "Focus Area",
        title: `${metrics.weakChapters[0].name} Concepts`,
        desc: `Your accuracy is ${metrics.weakChapters[0].accuracy}% in this chapter. Review the core concepts.`,
      }] : []),
      ...(metrics?.totalSkipped > 5 ? [{
        type: "Action Required",
        title: "Improve Time Management",
        desc: `You've skipped ${metrics.totalSkipped} questions. Allocate at least 60s per question.`,
      }] : []),
      {
        type: "Next Recommended",
        title: metrics?.strongChapters?.length > 0
          ? `${metrics.strongChapters[0].subject} Mastery`
          : "General Practice",
        desc: "Maintain your momentum with a personalized session.",
      }
  ].slice(0, 3);

  return (
    <div className={className}>
      <section className="">
        <div className="flex items-center justify-between">
          <p className="mt-8 text-on-surface-variant max-w-lg text-lg font-medium leading-relaxed opacity-80">
            See how you are doing in{" "}
            <span className="text-primary font-black px-2 py-0.5 bg-primary/5 rounded-lg">
              {targetedExams?.find((e: any) => e.id === selectedExam)?.name ||
                "your exam"}
            </span>{" "}
            preparation. Your score improves as you practice more.
          </p>
          <ExamTicker
            targetedExams={targetedExams}
            selectedExam={selectedExam}
            setSelectedExam={setSelectedExam}
          />
        </div>       
      </section>


      {!metrics ? (
        <section className="mt-5 text-center py-32 bg-surface-container-low/40 rounded-[4rem] border border-dashed border-outline-variant/10">
          <FlaskConical className="size-20 text-primary/10 mx-auto mb-8 animate-pulse" />
          <h2 className="text-3xl font-black text-on-surface tracking-tighter">
            You haven't taken any tests yet.
          </h2>
          <p className="text-on-surface-variant max-w-md text-sm mx-auto mt-6 leading-relaxed">
            Take a practice test for <span className="text-primary font-bold">{targetedExams?.find((e: any) => e.id === selectedExam)?.name}</span> to see your progress here.
          </p>
          <button
            onClick={() => navigate("/user/dashboard")}
            className="mt-5 px-10 py-4 bg-primary text-white rounded-full font-technical font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            Start a Practice Test
          </button>
        </section>
      ) : (
        <div className="mt-16 grid lg:grid-cols-12 overflow-hidden gap-8">
          <div className="w-full lg:col-span-4 mx-auto bg-primary p-10 rounded-[3rem] shadow-ambient hover-bloom group">
            <div className="size-16 bg-surface-container-high rounded-2xl flex items-center justify-center text-primary mb-8 shadow-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
              <TrendingUp size={28} />
            </div>
            <h3 className="text-[11px] font-technical font-black uppercase tracking-widest text-white opacity-60 mb-2">
              Tests you have taken
            </h3>
            <p className="text-8xl font-technical font-black text-white tracking-tighter leading-none">
              {metrics.testsCount || 0}
            </p>
            <p className="text-sm font-bold text-white mt-4">
              {chartMode} tests this month
            </p>
          </div>

          <GrowthChart
            performanceTrajectory={performanceTrajectory}
            maxScore={maxScore}
            chartMode={chartMode}
            setChartMode={setChartMode}
          />

          <div className="lg:col-span-8">
            <SubjectMastery examid={selectedExam} metrics={metrics} />
          </div>

          <FocusBalance metrics={metrics} />
          <div className="lg:col-span-6">
            <QuestionDistribution metrics={metrics} />
          </div>
          <div className="lg:col-span-6">
            <AiInsights aiInsights={aiInsights} />
          </div>
          {/* <MastHeadChapters metrics={metrics} />
          <SoilEnrichment metrics={metrics} /> */}
        </div>
      )}

      {/* <footer className="mt-16 flex items-center justify-between gap-8 p-12 bg-primary/5 rounded-[4rem] border border-primary/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingUp size={200} />
        </div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="size-20 rounded-3xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 text-white group hover:scale-105 transition-transform duration-500">
            <TrendingUp
              size={36}
              className="group-hover:translate-y-[-4px] transition-transform"
            />
          </div>
          <div>
            <h3 className="text-2xl font-black text-on-surface mb-2 tracking-tight">
              Cultivate your potential.
            </h3>
            <p className="text-on-surface-variant text-sm font-medium leading-relaxed max-w-sm">
              We've synthesized your performance data into a specialized growth
              path.
            </p>
          </div>
        </div>
        <div className="flex gap-4 relative z-10">
          <button
            onClick={() =>
              attempts.length > 0 && navigate(`/user/results/${attempts[0].id}`)
            }
            className="px-8 py-4 bg-surface rounded-full font-technical font-black text-[11px] uppercase tracking-[0.2em] text-on-surface-variant shadow-sm hover:shadow-xl hover:text-on-surface transition-all active:scale-95"
          >
            Review Errors
          </button>
          <button
            onClick={() => navigate("/user/dashboard")}
            className="px-8 py-4 bg-linear-to-r from-primary to-primary-container text-on-primary rounded-full font-technical font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Return to Study
          </button>
        </div>
      </footer> */}
    </div>
  );
};
