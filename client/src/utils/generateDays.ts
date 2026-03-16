export type DayItem = {
  date: Date
  label: string
  week: number
}

export function generateDays(): DayItem[] {
  const today = new Date()
  const days: DayItem[] = []

  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)

    days.push({
      date: d,
      label: d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
      }),
      week: Math.floor(i / 7) + 1,
    })
  }

  return days
}