import React, { useEffect, useRef, useState } from "react";

export default function AdvancedProctoring({
  videoRef,
  animationRef,
  detector,
  detect,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  animationRef: React.MutableRefObject<number | null>;
  detector: any;
  detect: any;
}) {
  useEffect(() => {
    if (detector) {
      detect;
    }
  }, [detector]);

  let isProcessing = false;

  const divRef = useRef<HTMLDivElement | null>(null);

  const [position, setPosition] = useState({ x: 100, y: 100 }); // initial position
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (!divRef.current) return;
    setDragging(true);

    const rect = divRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const onMouseUp = () => setDragging(false);

  React.useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-80 rounded-lg border"
      />

      {/* {warning && (
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-3 py-1 rounded">
          {warning}
        </div>
      )} */}

      {/* <div className="mt-2 text-sm">Violations: {violations}</div> */}
    </div>
  );
}
