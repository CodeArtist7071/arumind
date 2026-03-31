import { FileWarning } from "lucide-react"

export const SoilEnrichment = ({metrics}) => {
    return (
        <div className="lg:col-span-6 bg-surface-container-low p-10 rounded-[3rem] shadow-ambient hover-bloom">
            <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-4">
                    <div className="size-10 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
                        <FileWarning size={20} />
                    </div>
                    Soil Enrichment
                </h3>
            </div>
            <div className="space-y-4">
                {metrics.weakChapters.length > 0 ? (
                    metrics.weakChapters.map((ch, i) => (
                        <div key={i} className="flex justify-between items-center p-6 bg-tertiary/5 rounded-3xl hover:bg-tertiary/10 transition-all duration-300 group">
                            <div>
                                <p className="font-technical font-black text-sm text-on-surface uppercase tracking-wider">{ch.name}</p>
                                <p className="text-[10px] font-technical font-black text-tertiary uppercase tracking-[0.2em] mt-1 opacity-60">{ch.subject}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-technical font-black text-tertiary tracking-tighter">
                                    {ch.accuracy}%
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-on-surface-variant text-xs italic opacity-40 p-6">Your garden is fully balanced.</p>
                )}
            </div>
        </div>
    )
}