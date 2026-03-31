const QuestionDistribution = ({ metrics }: { metrics: any }) => {
    const total = (metrics?.totalCorrect || 0) + (metrics?.totalIncorrect || 0) + (metrics?.totalSkipped || 0);
    
    return (
        <div className="bg-surface-container-low p-10 rounded-[3rem] shadow-ambient group">
            <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-4">
                  <div className="size-10 bg-on-surface/5 rounded-xl flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                     <div className="size-2 rounded-full bg-current" />
                  </div>
                  Syllabus Coverage
                </h3>
                <span className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-40">
                    {total} Data Points
                </span>
            </div>
            
            <div className="h-6 w-full flex rounded-full overflow-hidden bg-on-surface/5 border border-outline-variant/10 shadow-inner group-hover:scale-[1.01] transition-transform duration-500">
                <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${((metrics?.totalCorrect || 0) / (total || 1)) * 100}%` }} />
                <div className="bg-tertiary h-full transition-all duration-1000" style={{ width: `${((metrics?.totalIncorrect || 0) / (total || 1)) * 100}%` }} />
                <div className="bg-on-surface/20 h-full transition-all duration-1000" style={{ width: `${((metrics?.totalSkipped || 0) / (total || 1)) * 100}%` }} />
            </div>

            <div className="flex flex-wrap gap-8 mt-10">
                <div className="flex items-center gap-4 group/item">
                    <div className="size-3 rounded-full bg-primary shadow-sm shadow-primary/20 group-hover/item:scale-125 transition-transform" />
                    <div>
                        <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-widest opacity-40">Resolved</p>
                        <p className="text-sm font-technical font-black text-on-surface">{metrics?.totalCorrect || 0}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 group/item">
                    <div className="size-3 rounded-full bg-tertiary shadow-sm shadow-tertiary/20 group-hover/item:scale-125 transition-transform" />
                    <div>
                        <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-widest opacity-40">Errata</p>
                        <p className="text-sm font-technical font-black text-on-surface">{metrics?.totalIncorrect || 0}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 group/item">
                    <div className="size-3 rounded-full bg-on-surface/30 group-hover/item:scale-125 transition-transform" />
                    <div>
                        <p className="text-[10px] font-technical font-black text-on-surface-variant uppercase tracking-widest opacity-40">Passed</p>
                        <p className="text-sm font-technical font-black text-on-surface">{metrics?.totalSkipped || 0}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default QuestionDistribution;
