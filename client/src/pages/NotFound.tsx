import React from "react";
import { useNavigate } from "react-router-dom";
import { Compass, ArrowRight, Wind } from "lucide-react";

/**
 * 404: Lattice Connectivity Failure.
 * A high-fidelity manifestation of the "Digital Greenhouse" design system.
 */
const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#fbfaee] flex flex-col items-center justify-center p-6 lg:p-20 relative overflow-hidden font-narrative">
            {/* Organic Background Elements: Tonal Sectioning Ritual */}
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#f5f4e8] rounded-full blur-[120px] opacity-60 animate-pulse transition-all duration-[10000ms]" />
            <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-[#bccbb9]/20 rounded-full blur-[100px]" />

            {/* Central Manifestation Card: Overlapping Paper Layers */}
            <div className="relative z-10 max-w-2xl w-full text-center space-y-12">
                
                {/* Massive Editorial Header: Intentional Asymmetry */}
                <div className="relative inline-block">
                    <h1 className="text-[12rem] lg:text-[18rem] font-black leading-[0.8] tracking-tighter text-slate-900 select-none opacity-5 flex items-center justify-center -rotate-6">
                        404
                    </h1>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                         {/* Display-LG Face */}
                        <div className="size-24 bg-linear-to-br from-[#006e2f] to-[#22c55e] rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-[#006e2f]/20 mb-8 animate-reveal">
                            <Wind size={40} className="animate-pulse" />
                        </div>
                        <h2 className="text-4xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-none mb-4">
                            Lattice <span className="text-[#006e2f] italic">Connectivity</span> Failure
                        </h2>

                        {/* Technical Label: Space Grotesk Stamping */}
                        <div className="flex items-center gap-3 bg-slate-900/5 px-4 py-1.5 rounded-full mb-8">
                             <div className="size-2 bg-[#006e2f] rounded-full animate-pulse" />
                             <span className="font-technical text-[10px] uppercase font-black tracking-[0.3em] text-[#006e2f]">
                                CODE: PATH_NOT_MANIFESTED
                             </span>
                        </div>
                    </div>
                </div>

                <div className="max-w-md mx-auto space-y-8 animate-reveal animation-delay-500">
                    <p className="text-xl text-slate-600/80 leading-relaxed">
                        The specific curriculum horizontal you are seeking has not yet Manifested within this educational greenhouse. It may have been decommissioned or relocated to a a standard administrative orbit.
                    </p>

                    {/* High-Contrast Control Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        {/* Primary Button: Tactile & Weighted */}
                        <button
                            onClick={() => navigate("/user/dashboard")}
                            className="w-full sm:w-auto px-10 py-5 bg-linear-to-r from-[#006e2f] to-[#22c55e] text-white rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-[#006e2f]/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-4 group"
                        >
                            <span>Re-Synchronize Orbit</span>
                            <Compass size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                        </button>

                        <button
                            onClick={() => navigate(-1)}
                            className="w-full sm:w-auto px-10 py-5 bg-[#f5f4e8] text-slate-800 rounded-full font-black text-xs uppercase tracking-[0.3em] hover:bg-[#dbdbcf] transition-all duration-300 flex items-center justify-center gap-4"
                        >
                            <span>Reverse Manifestation</span>
                            <ArrowRight size={18} className="opacity-40" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Decoration */}
            <div className="absolute bottom-10 left-10 hidden lg:block opacity-20">
                 <div className="flex flex-col font-technical text-[9px] font-black uppercase tracking-[0.5em] text-[#006e2f] space-y-2">
                     <span>STABILITY: NOMINAL</span>
                     <span>ATMOSPHERE: CONTROLLED</span>
                     <span>DENSITY: OPTIMAL</span>
                 </div>
            </div>
        </div>
    );
};

export default NotFound;
