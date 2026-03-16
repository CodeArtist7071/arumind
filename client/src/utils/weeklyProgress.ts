


export const calculateWeeklyProgress = (
  progress: Record<string, boolean[]>
) => {
  const weeks = [0, 0, 0, 0, 0];

  Object.values(progress).forEach((days) => {
    days.forEach((done, index) => {
      if (done) {
        const weekIndex = Math.floor(index / 7);
        weeks[weekIndex] += 1;
      }
    });
  });

  return [
    { name: "Week 1", value: weeks[0] },
    { name: "Week 2", value: weeks[1] },
    { name: "Week 3", value: weeks[2] },
    { name: "Week 4", value: weeks[3] },
    { name: "Week 5", value: weeks[4] },
  ];
};