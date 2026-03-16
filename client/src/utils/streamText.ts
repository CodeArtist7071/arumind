export function streamText(text, onUpdate, delay = 1000, speed = 40) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      let i = 0;

      const interval = setInterval(() => {
        onUpdate(text.slice(0, i + 1));
        i++;

        if (i === text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    }, delay);
  });
}