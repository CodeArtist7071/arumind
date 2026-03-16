interface Props {
  videoRef: any;
  detector: any;
  animationRef: any;
  isProcessing: any;
  frameCount: any;
  detect: any;
  DEBUG: any;
  registerViolation: any;
}

export const detect = async ({
  videoRef,
  detector,
  animationRef,
  isProcessing,
  frameCount,
  detect,
  DEBUG,
  registerViolation,
}: Props) => {
  if (!videoRef.current || !detector) return;

  if (videoRef.current.readyState !== 4) {
    animationRef.current = requestAnimationFrame(detect);
    return;
  }

  if (isProcessing) {
    animationRef.current = requestAnimationFrame(detect);
    return;
  }

  isProcessing = true;
  frameCount++;

  try {
    const faces = await detector.estimateFaces(videoRef.current);

    if (DEBUG && frameCount % 30 === 0) {
      console.log("🎥 Frame:", frameCount);
      console.log("👤 Faces detected:", faces.length);
    }

    if (faces.length === 0) {
      //   registerViolation("No face detected 🚨");
    } else {
      const keypoints = faces[0].keypoints;
      const leftIris = keypoints[468];
      const leftEyeLeft = keypoints[33];
      const leftEyeRight = keypoints[133];

      if (leftIris && leftEyeLeft && leftEyeRight) {
        const gazeRatio =
          (leftIris.x - leftEyeLeft.x) / (leftEyeRight.x - leftEyeLeft.x);

        if (DEBUG && frameCount % 30 === 0) {
          console.log("👁️ Gaze Ratio:", gazeRatio.toFixed(2));
        }

        if (gazeRatio < 0.25) {
          registerViolation("Looking Right 👀");
          // setCheatingAlert(true);
        } else if (gazeRatio > 0.75) {
          registerViolation("Looking Left 👀");
          // setCheatingAlert(true);
        } else {
          // setWarning("");
          // setCheatingAlert(false);
        }
      }
    }
  } catch (err) {
    console.error("❌ Detection error:", err);
  }

  isProcessing = false;
  animationRef.current = requestAnimationFrame(detect);
};
