import { ArrowUpRight, BookOpenCheck, Layers3 } from "lucide-react";
import { useNavigate } from "react-router";

const resultTypes = [
  {
    title: "Practice results",
    category: "Chapter practice",
    description:
      "Review chapter-wise attempts, check your answers, and see where to focus next.",
    icon: BookOpenCheck,
    palette: {
      card: "from-primary/12 via-primary/5 to-surface-container-low",
      icon: "bg-primary/12 text-primary",
      badge: "bg-primary/10 text-primary",
    },
  },
  {
    title: "Mock test results",
    category: "Full exam simulations",
    description:
      "Review completed mock exams and understand your readiness across full-length tests.",
    icon: Layers3,
    palette: {
      card: "from-violet-500/12 via-violet-500/5 to-surface-container-low",
      icon: "bg-violet-500/12 text-violet-600",
      badge: "bg-violet-500/10 text-violet-700",
    },
  },
];

const ResultSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface font-narrative text-on-surface antialiased">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8 sm:mb-10">
          <p className="text-sm font-semibold text-primary">Your progress</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Results
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
            Choose a results collection to review your attempts and answers.
          </p>
        </header>

        <section aria-label="Choose results" className="grid gap-4 md:grid-cols-2 md:gap-6">
          {resultTypes.map(({ title, category, description, icon: Icon, palette }) => (
            <article
              key={title}
              className={`flex min-h-64 flex-col overflow-hidden rounded-3xl border border-outline-variant/25 bg-gradient-to-br ${palette.card} p-5 shadow-sm transition-shadow hover:shadow-md sm:p-7`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${palette.icon}`}>
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${palette.badge}`}>
                  {category}
                </span>
              </div>

              <div className="mt-6 flex-1">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-on-surface-variant sm:text-base">
                  {description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("history")}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto sm:self-start"
              >
                View results
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default ResultSelection;
