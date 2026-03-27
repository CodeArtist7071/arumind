import { useEffect } from "react";
import  {supabase, adminSupabase } from "../../utils/supabase";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";

export default function UserManagement() {
  const { user } = useSelector((state: RootState) => state.user ?? null);
  const dispatch = useDispatch<AppDispatch>();
  console.log("user", user);
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await adminSupabase.from("profiles").select("*");

        const JsonData = data;
        console.log("JSON", data);
      } catch (error: any) {
        console.log(error);
      }
    };

    loadData();
  }, [user]);
  async function dates() {
    const  { data: profiles, error } = await adminSupabase
  .from('profiles')
  .select('*')
    return profiles
  }

  console.log(dates());

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-on-surface dark:text-slate-100">
      {/* Main */}
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            <p className="text-sm text-on-surface-variant">
              Manage student registrations and verification status.
            </p>
          </div>

          <button className="bg-primary text-white px-5 py-2.5 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined">person_add</span>
            Add New User
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Students" value="12,450" change="+2.5%" />
          <StatCard title="Active Today" value="856" change="+5.2%" />
          <StatCard title="Verified Accounts" value="98%" change="+0.5%" />
          <StatCard title="New This Week" value="+150" change="+12%" />
        </div>

        {/* Search */}
        <div className="bg-surface dark:bg-slate-900 rounded-xl border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="text"
              placeholder="Search students..."
              className="flex-1 min-w-[300px] bg-surface-container-high dark:bg-slate-800 rounded-lg px-4 py-2 text-sm"
            />

            <select className="bg-surface-container-high dark:bg-slate-800 rounded-lg px-4 py-2 text-sm">
              <option>Status: All</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Pending</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface dark:bg-slate-900 rounded-xl border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Exam</th>
                <th className="px-6 py-4">Reg Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              <UserRow
                name="Amitav Mohapatra"
                email="amitav.m@example.com"
                exam="OPSC Civil"
                date="Oct 12, 2023"
                status="Verified"
              />

              <UserRow
                name="Priyanka Das"
                email="priyanka.das@outlook.com"
                exam="OSSC GL"
                date="Oct 14, 2023"
                status="Pending"
              />
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

/* Components */

function SidebarItem({ icon, label, active }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
        active
          ? "bg-primary/10 text-primary font-semibold"
          : "text-slate-600 hover:bg-surface-container-high"
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {label}
    </a>
  );
}

function StatCard({ title, value, change }) {
  return (
    <div className="bg-surface dark:bg-slate-900 p-6 rounded-xl border shadow-sm">
      <p className="text-xs text-on-surface-variant mb-1">{title}</p>

      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-bold">{value}</h3>

        <span className="text-emerald-500 text-xs flex items-center">
          {change}
          <span className="material-symbols-outlined text-sm">trending_up</span>
        </span>
      </div>
    </div>
  );
}

function UserRow({ name, email, exam, date, status }) {
  return (
    <tr className="border-t hover:bg-surface-container-low dark:hover:bg-slate-800/30">
      <td className="px-6 py-4">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-on-surface-variant">{email}</p>
        </div>
      </td>

      <td className="px-6 py-4 text-sm">{exam}</td>

      <td className="px-6 py-4 text-sm">{date}</td>

      <td className="px-6 py-4 text-sm">{status}</td>

      <td className="px-6 py-4 text-right flex justify-end gap-2">
        <button className="p-1 hover:text-primary">
          <span className="material-symbols-outlined">visibility</span>
        </button>

        <button className="p-1 hover:text-primary">
          <span className="material-symbols-outlined">edit</span>
        </button>

        <button className="p-1 hover:text-red-600">
          <span className="material-symbols-outlined">block</span>
        </button>
      </td>
    </tr>
  );
}
