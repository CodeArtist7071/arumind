import { Book } from "lucide-react";

const AiInsights = ({ aiInsights }: { aiInsights: any[] }) => {
    return (
        <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/10 shadow-ambient overflow-hidden relative group">
          <div className="absolute -top-10 -right-10 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
             <Book size={200} />
          </div>
          <div className="flex items-center gap-4 mb-10 relative z-10">
            <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
               <Book size={20} />
            </div>
            <h3 className="text-xl font-black text-on-surface tracking-tight">Technical Insights</h3>
          </div>
          <div className="grid md:grid-rows-3 gap-6 relative z-10">
            {aiInsights.map((insight, index) => (
              <div key={index} className="p-6 bg-surface/40 backdrop-blur-sm rounded-3xl border border-outline-variant/5 hover:scale-105 transition-all duration-500">
                <span className="text-primary text-[9px] font-technical font-black uppercase tracking-[0.2em] opacity-60">{insight.type}</span>
                <p className="text-sm font-black text-on-surface mt-2 leading-tight uppercase tracking-tight">{insight.title}</p>
                <p className="text-xs text-on-surface-variant mt-3 leading-relaxed font-medium opacity-80">{insight.desc}</p>
              </div>
            ))}
          </div>
        </div>
    )
}

export default AiInsights;
