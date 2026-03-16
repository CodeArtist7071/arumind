  export const startCamera = async ({videoRef}) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: "user",
      },
    });

    if (!videoRef.current) return;

    videoRef.current.srcObject = stream;

    await new Promise<void>((resolve) => {
      videoRef.current!.onloadedmetadata = () => {
        videoRef.current!.play();
        resolve();
      };
    });
  };