export const startCamera = async ({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement> }) => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: 640,
      height: 480,
      facingMode: "user",
    },
  });

  if (videoRef.current) {
    videoRef.current.srcObject = stream;

    await new Promise<void>((resolve) => {
      videoRef.current!.onloadedmetadata = () => {
        videoRef.current!.play();
        resolve();
      };
    });
  }

  return stream;
};