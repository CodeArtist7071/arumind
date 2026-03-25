const QuestionDistribution = ({ metrics }: { metrics: any }) => {
    return (
        <div className="md:col-span-12 bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Question Distribution</h3>
                <span className="text-sm text-gray-500 font-medium">
                    Total {(metrics?.totalCorrect || 0) + (metrics?.totalIncorrect || 0) + (metrics?.totalSkipped || 0)} Questions
                </span>
            </div>
            <div className="h-4 w-full flex rounded-full overflow-hidden bg-gray-100">
                <div className="bg-green-600 h-full transition-all" style={{ width: `${((metrics?.totalCorrect || 0) / (((metrics?.totalCorrect || 0) + (metrics?.totalIncorrect || 0) + (metrics?.totalSkipped || 0)) || 1)) * 100}%` }} />
                <div className="bg-red-500 h-full transition-all" style={{ width: `${((metrics?.totalIncorrect || 0) / (((metrics?.totalCorrect || 0) + (metrics?.totalIncorrect || 0) + (metrics?.totalSkipped || 0)) || 1)) * 100}%` }} />
                <div className="bg-gray-400 h-full transition-all" style={{ width: `${((metrics?.totalSkipped || 0) / (((metrics?.totalCorrect || 0) + (metrics?.totalIncorrect || 0) + (metrics?.totalSkipped || 0)) || 1)) * 100}%` }} />
            </div>
            <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-green-600" />
                    <span className="text-sm font-bold">{metrics?.totalCorrect || 0} Correct</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-red-500" />
                    <span className="text-sm font-bold">{metrics?.totalIncorrect || 0} Incorrect</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-gray-400" />
                    <span className="text-sm font-bold">{metrics?.totalSkipped || 0} Skipped</span>
                </div>
            </div>
        </div>
    )
}

export default QuestionDistribution;