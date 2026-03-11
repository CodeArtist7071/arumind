
import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";


const Profile = () => {
    const {user} = useSelector((state:RootState)=>state.user)
    const userData = user?.user_metadata
  return (
    <div className="bg-[#f6f6f8] text-slate-900 font-sans min-h-screen flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 lg:px-20 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* {JSON.stringify(user)} */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">Odisha Exam Prep</h1>
              <p className="text-xs text-slate-500">Student Dashboard</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a className="text-sm font-medium text-slate-600 hover:text-blue-600" href="#">
              Home
            </a>
            <a className="text-sm font-medium text-slate-600 hover:text-blue-600" href="#">
              Test Series
            </a>
            <a className="text-sm font-medium text-slate-600 hover:text-blue-600" href="#">
              Materials
            </a>
            <a className="text-sm font-bold text-blue-600" href="#">
              Profile
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
            </button>

            <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-200 overflow-hidden">
              <img
                className="h-full w-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkm62oVe8PBmJKTxERvO4Lrh0_HD3BfZEz-WfJeCR8meRYzwK9mxGf-csezIjIddmZ5yVCx--GA0xfHowJD2IrrWi1FW_e1iLtkQ2u6JL6jZkYDbpX2WH1A4F_cFGoax66NvGt-1BEvSS_dR5P5wiwVtcaSeTlk43aqx0ouDo-rnkJBsuvHEUDwDZvgrxWbDh1b5m9LzAHrcB8b74PDHhCaKGKniJs-7ZdARZ6v7IwSG2l8O9WjbgWBn-oqfi5tGs3HBnrnR_gfw"
                alt="profile"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-8 lg:px-20">
        <div className="mx-auto max-w-7xl">

          {/* Profile Card */}
          <div className="mb-8 flex sm:flex-col md:flex-row items-center gap-6 rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
            
            <div className="relative">
              <div className="h-32 w-32 rounded-full border-4 border-white ring-4 ring-blue-100 overflow-hidden shadow-xl">
                <img
                  className="h-full w-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAd-e1E_Lk0b-ybYISMm_WOW4WPLlM2nwB3V9Mce8MWzNP6t0d8PYOC1ONJAtTGBx742aCjW8DtymHO3BQR46t2ZONZNBcijGTx_Vuid7YKLFuWDyGfD7F8hfVH3eUtknjLexY-rM_Xsj95u4H1vAM8zWDhT0275syJQkmZUv_VX83rkfg2GrB5Yr5EXPH-3nLOO1d7rHbRjL0x7JySaR08nx1DJiY_Z-HvR68_H8LQa-JqPp-bMqVBkTyMtinJB6ekYqkLFlOmLg"
                  alt="student"
                />
              </div>

              <div className={userData?.email_verified ? "bg-green-500 absolute bottom-0 right-0 flex h-8 w-full items-center justify-center rounded-full  text-white shadow-lg ring-4 ring-white" : "absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full  text-white shadow-lg ring-4 ring-white"}>
                <span className="material-symbols-outlined text-[18px]">
                  {userData?.email_verified ? "Verified":"Not Verified"}
                </span>
              </div>
            </div>

            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl font-bold">Aurobinda Mohanty</h2>
              <span className="inline-flex mt-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">
                OPSC Aspirant
              </span>

              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-500 text-sm mt-3">
                <span>Bhubaneswar, Odisha</span>
                <span>Batch of 2024</span>
                <span>Joined Oct 2023</span>
              </div>
            </div>

            <button className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700">
              Edit Profile
            </button>
          </div>

          {/* Grid */}
          <div className="grid sm:grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left */}
            <div className="lg:col-span-8 flex sm:flex-col gap-8">

              {/* Personal Info */}
              <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Info label="Full Name" value="Aurobinda Mohanty" />
                  <Info label="Email Address" value={user.email} />
                  <Info label="Phone Number" value={user.phone} />
                  <Info label="Location" value="Chandrasekharpur, Bhubaneswar" />
                </div>
              </section>

              {/* Academic */}
              <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6">Academic Details</h3>

                <div className="space-y-6">
                  <Academic
                    degree="Master of Technology (M.Tech)"
                    college="Biju Patnaik University of Technology"
                    year="2022 • 8.5 CGPA"
                  />
                  <Academic
                    degree="Bachelor of Technology (B.Tech)"
                    college="VSSUT, Burla"
                    year="2020 • 7.9 CGPA"
                  />
                </div>
              </section>

            </div>

            {/* Right */}
            <div className="lg:col-span-4 flex flex-col gap-8">

              {/* Progress */}
              <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6">Progress Summary</h3>

                <p className="text-sm text-slate-500">Total Mock Tests</p>
                <p className="text-2xl font-bold">42</p>

                <div className="mt-4">
                  <p className="text-sm text-slate-500">Overall Accuracy</p>
                  <div className="h-2 w-full bg-slate-200 rounded-full mt-2">
                    <div className="h-2 bg-blue-600 w-[78%] rounded-full"></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <Stat title="Tests Won" value="12" />
                  <Stat title="Study Hours" value="840" />
                </div>
              </section>

              {/* Account */}
              <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6">Account Status</h3>

                <div className="bg-blue-600 text-white rounded-xl p-4 mb-4">
                  <p className="text-xs uppercase">Premium Plan</p>
                  <p className="text-xl font-bold">Elite Test Series</p>
                  <p className="text-xs opacity-80">Full Access to OPSC & OSSC</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Renewal Date</span>
                    <span className="font-bold">15 Oct 2024</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Payment</span>
                    <span className="font-bold">₹2,499</span>
                  </div>
                </div>

                <button className="w-full mt-4 border border-blue-600 text-blue-600 rounded-xl py-2 font-bold hover:bg-blue-600 hover:text-white">
                  Manage Subscription
                </button>
              </section>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase text-slate-400">{label}</p>
    <p className="font-semibold text-slate-800">{value}</p>
  </div>
);

const Academic = ({ degree, college, year }) => (
  <div>
    <p className="font-bold text-slate-800">{degree}</p>
    <p className="text-sm text-slate-500">{college}</p>
    <p className="text-xs text-slate-400">{year}</p>
  </div>
);

const Stat = ({ title, value }) => (
  <div className="text-center">
    <p className="text-lg font-bold text-blue-600">{value}</p>
    <p className="text-xs uppercase text-slate-400">{title}</p>
  </div>
);

export default Profile;