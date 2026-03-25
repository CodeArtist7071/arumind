import { Book } from "lucide-react";

const AiInsights = ({ aiInsights }: { aiInsights: any[] }) => {
    return (
        <div className="md:col-span-12 bg-green-900 p-6 rounded-xl text-white">
          <div className="flex items-center gap-3 mb-4">
            <Book className="text-green-300" size={24} />
            <h3 className="text-xl font-bold">AI Improvement Plan</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {aiInsights.map((insight, index) => (
              <div key={index} className="p-4 bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-all">
                <span className="text-green-300 text-[10px] font-bold uppercase tracking-widest">{insight.type}</span>
                <p className="text-base font-bold mt-1">{insight.title}</p>
                <p className="text-sm text-green-200 mt-1">{insight.desc}</p>
              </div>
            ))}
          </div>
        </div>
    )
}

export default AiInsights;