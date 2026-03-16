import { useEffect, useState } from "react";

export default function StreamingText({ text, delay = 1000, speed = 30 }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const startDelay = setTimeout(() => {
      let i = 0;

      const interval = setInterval(() => {
        setDisplayText(text.slice(0, i + 1));
        i++;

        if (i === text.length) clearInterval(interval);
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startDelay);
  }, [text, delay, speed]);

  return (
    <span className="font-mono">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}