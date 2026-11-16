import React from "react";
import {
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  GraduationCap,
  Layers3,
  Users,
} from "lucide-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../../store";

const stats = [
  { title: "Total students", value: "1,245", icon: Users, note: "Registered learners", tint: "bg-[#e7f0e1] text-[#315f29] dark:bg-[#263d24] dark:text-[#c9e4c0]" },
  { title: "Active exams", value: "8", icon: GraduationCap, note: "Available to learners", tint: "bg-[#f4eddb] text-[#816329] dark:bg-[#3d3522] dark:text-[#e7ce91]" },
  { title: "Total chapters", value: "317", icon: Layers3, note: "Across your curriculum", tint: "bg-[#e8edf4] text-[#456184] dark:bg-[#263344] dark:text-[#c5d7ef]" },
  { title: "Questions live", value: "8,450", icon: CircleHelp, note: "Published in question bank", tint: "bg-[#f2e8e3] text-[#8a5541] dark:bg-[#3d2e28] dark:text-[#e7b9a4]" },
];

const shortcuts = [
  { title: "Build a curriculum", description: "Organize boards, exams, subjects and chapters.", path: "/admin/lattice", icon: BookOpen, label: "Open curriculum designer" },
  { title: "Manage question bank", description: "Review, update and publish exam questions.", path: "/admin/questions", icon: CircleHelp, label: "Manage questions" },
  { title: "Manage learners", description: "View accounts and update access roles.", path: "/admin/users", icon: Users, label: "Manage users" },
];

const AdminDashboard: React.FC = () => {
  const { profile } = useSelector((state: RootState) => state.user);
  const firstName = profile?.email?.split("@")[0]?.split(/[._-]/)[0];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <section className="relative overflow-hidden rounded-[28px] bg-[#173f19] px-6 py-8 text-white sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-28 size-80 rounded-full border-[1px] border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-1 -top-16 size-64 rounded-full border-[1px] border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 right-36 size-72 rounded-full bg-[#79a465]/15 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-[#dcebd5]">
            <span className="size-1.5 rounded-full bg-[#b7db9d]" />
            Admin workspace
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Your learning platform, organized in one place. Review what’s live and jump into the work that needs your attention.
          </p>
          <Link to="/admin/lattice" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#e3efdb] px-4 text-sm font-semibold text-[#214c1c] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Open curriculum designer <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section aria-label="Platform summary">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Platform overview</h2>
            <p className="mt-1 text-sm text-[#778171] dark:text-[#a6b09f]">A snapshot of your learning content and community.</p>
          </div>
          <span className="hidden items-center gap-2 rounded-full bg-[#e8f0e3] px-3 py-1.5 text-[11px] font-medium text-[#426b39] dark:bg-[#203620] dark:text-[#b7d7ad] sm:inline-flex">
            <span className="size-1.5 rounded-full bg-[#4c9a43]" /> Content overview
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ title, value, icon: Icon, note, tint }) => (
            <article key={title} className="rounded-2xl border border-[#e5e9e0] bg-[#fbfcf8] p-5 dark:border-white/10 dark:bg-[#171e17] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#71806c] dark:text-[#aeb9aa]">{title}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
                </div>
                <span className={`grid size-10 place-items-center rounded-xl ${tint}`}><Icon size={19} strokeWidth={1.8} /></span>
              </div>
              <p className="mt-4 text-xs text-[#879181] dark:text-[#919d8d]">{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Quick actions</h2>
          <p className="mt-1 text-sm text-[#778171] dark:text-[#a6b09f]">Go straight to the tools you use most.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {shortcuts.map(({ title, description, path, icon: Icon, label }) => (
            <Link key={path} to={path} aria-label={label} className="group flex min-h-[150px] items-start gap-4 rounded-2xl border border-[#e5e9e0] bg-[#fbfcf8] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#cad9c3] hover:shadow-[0_12px_30px_rgba(35,62,28,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e] dark:border-white/10 dark:bg-[#171e17] dark:hover:border-[#46623d] sm:p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e8f0e3] text-[#315f29] transition-colors group-hover:bg-[#d9e8d1] dark:bg-[#263d24] dark:text-[#c9e4c0]"><Icon size={20} strokeWidth={1.8} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3 text-sm font-semibold">{title}<ArrowUpRight className="shrink-0 text-[#899483] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#315f29]" size={16} /></span>
                <span className="mt-2 block text-sm leading-5 text-[#778171] dark:text-[#a6b09f]">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
