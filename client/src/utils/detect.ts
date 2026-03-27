// detect.ts
interface DetectProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  detector: any;
  animationRef: React.RefObject<number | null>;
  isProcessingRef: React.RefObject<boolean>;
  frameCountRef: React.RefObject<number>;
  noFaceStreakRef: React.RefObject<number>;
  registerViolation: (type: string) => void;
  onFaceStatusChange?: (detected: boolean) => void;
  onDiagnostic?: (data: { inferenceTime: number; faces: number }) => void;
}

export const detect = async (props: DetectProps) => {
  const {
    videoRef,
    detector,
    animationRef,
    isProcessingRef,
    frameCountRef,
    noFaceStreakRef,
    registerViolation,
    onFaceStatusChange,
    onDiagnostic,
  } = props;

  if (!videoRef.current || !detector) return;

  if (videoRef.current.readyState !== 4) {
    animationRef.current = requestAnimationFrame(() => detect(props));
    return;
  }

  if (isProcessingRef.current) {
    animationRef.current = requestAnimationFrame(() => detect(props));
    return;
  }

  isProcessingRef.current = true;
  frameCountRef.current++;
  const startTime = performance.now();

  try {
    const faces = await detector.estimateFaces(videoRef.current, {
      flipHorizontal: false,
    });

    const inferenceTime = performance.now() - startTime;
    onDiagnostic?.({ inferenceTime, faces: faces.length });

    if (faces.length === 0) {
      noFaceStreakRef.current++;
      if (noFaceStreakRef.current >= 40) {
        onFaceStatusChange?.(false);
        registerViolation('no_face');
        noFaceStreakRef.current = 0;
      }
    } else {
      noFaceStreakRef.current = 0;
      onFaceStatusChange?.(true);

      if (faces.length > 1) {
        registerViolation('multiple_faces');
      }

      // Check keypoints structure (MediaPipe runtime vs TFJS runtime differences)
      const keypoints = faces[0].keypoints;
      if (keypoints && keypoints.length > 468) {
        const leftIris = keypoints[468];
        const leftEyeLeft = keypoints[33];
        const leftEyeRight = keypoints[133];

        if (leftIris && leftEyeLeft && leftEyeRight) {
          const gazeRatio = (leftIris.x - leftEyeLeft.x) / (leftEyeRight.x - leftEyeLeft.x);
          if (gazeRatio < 0.15) registerViolation('gaze_right');
          else if (gazeRatio > 0.85) registerViolation('gaze_left');
        }
      }
    }
  } catch (err) {
    console.error('Detection error:', err);
  }

  isProcessingRef.current = false;
  animationRef.current = requestAnimationFrame(() => detect(props));
};
