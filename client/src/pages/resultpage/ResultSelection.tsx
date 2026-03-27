import { Edit3Icon, Layers, WorkflowIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router";

interface cardDataProps {
    title: string;
    description: string;
    completed: number;
    avgScore: string;
    icon: React.ReactNode;
    buttonText: string;
}


const cardData: cardDataProps[] = [
    {
        title: "Practice Test Results",
        description: "Track your chapter-wise performance with accuracy, speed, and topic mastery.",
        completed: 124,
        avgScore: "78%",
        icon: <Edit3Icon />,
        buttonText: "View Results"
    },
    {
        title: "Mock Exam Results",
        description: "Full-length simulated exams. Analyze ranking and readiness.",
        completed: 8,
        avgScore: "#42",
        icon: <Layers />,
        buttonText: "Explore Analytics"
    }
]


const latestReportData = [
    {
        title: "Prelims Mock Test #12",
        date: "Completed on Oct 24, 2023",
        score: "142/200",
        status: "Full Report"
    }
]

const ResultSelection = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen text-[#1b1c15] selection:bg-primary-container selection:text-on-primary-container">

            {/* Top App Bar */}
            {/* <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#fbfaee]">
        <div className="flex items-center gap-4">
          <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#f5f4e8] transition active:scale-90">
            <span className="material-symbols-outlined text-[#3d4a3d]">arrow_back</span>
          </button>
          <h1 className="text-2xl font-black text-[#006e2f] tracking-tight">
            OPSC Journey
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-[#f5f4e8] active:scale-90">
            <span className="material-symbols-outlined text-[#3d4a3d]">
              notifications
            </span>
          </button>
          <button className="p-2 rounded-full hover:bg-[#f5f4e8] active:scale-90">
            <span className="material-symbols-outlined text-[#3d4a3d]">
              account_circle
            </span>
          </button>
        </div>
      </header> */}

            {/* Main Content */}
            <main className="pt-5 pb-32 max-w-5xl mx-auto">

                {/* Header */}
                <div>
                    <h2 className="text-5xl font-extrabold text-center"> Performance <span className="text-[#006e2f] italic">Analytics</span></h2>
                    <p className="text-center max-w-2xl text-lg mx-auto mb-15 mt-5">Review your progress through detailed insights. Choose between focused practice drills or comprehensive mock simulations.</p>
                </div>

                {/* Cards */}
                <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
                    {cardData.map((el, index) => (
                        <div className="w-[450px] bg-surface/50 px-6 py-15 rounded-xl flex flex-col justify-between hover:bg-[#e9e9dd] transition-all duration-300">
                            <div>
                                <div className="w-16 h-16 bg-[#e4e3d7] rounded-2xl flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-4xl text-green-700">
                                        {el.icon}
                                    </span>
                                </div>

                                <h3 className="text-2xl font-bold mb-2">
                                    {el.title}
                                </h3>
                                <p className="text-[#3d4a3d] mb-6">
                                    {el.description}
                                </p>

                                <div className="flex gap-6 mb-6">
                                    <div>
                                        <p className="text-xs uppercase opacity-60">Completed</p>
                                        <p className="text-xl font-bold text-green-700">{el.completed}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase opacity-60">Avg Score</p>
                                        <p className="text-xl font-bold text-orange-600">{el.avgScore}</p>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => navigate("history")} className="w-full cursor-pointer py-3 bg-green-700 text-white rounded-full font-bold hover:shadow-lg">
                                {el.buttonText}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Latest Report */}
                <div className="mt-16">
                    <h4 className="text-xs uppercase tracking-widest mb-4 flex items-center gap-3">
                        Latest Report
                        <div className="h-px flex-1 bg-gray-300"></div>
                    </h4>
                    {latestReportData.map((el, index) => (
                        <div key={index} className="bg-surface p-6 rounded-lg flex sm:flex-col md:flex-row justify-between items-center gap-4 shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center">
                                    <span className="material-symbols-outlined">
                                        <WorkflowIcon />
                                    </span>
                                </div>
                                <div>
                                    <p className="font-bold">{el.title}</p>
                                    <p className="text-xs text-gray-500">
                                        {el.date}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-xl font-bold">{el.score}</p>
                                    <p className="text-xs uppercase">Final Score</p>
                                </div>
                                <button className="px-4 py-2 border rounded-full text-sm font-bold hover:bg-gray-100">
                                    {el.status}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ResultSelection;
