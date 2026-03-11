import { Edit, Grid2X2, NotebookTabs } from "lucide-react";
// import ProctoringCamera from "./ProctoringCamera";
import { useEffect, useRef, useState } from "react";
import AdvancedProctoring from "./AdvanceProctoring";
import { useNavigate, useParams } from "react-router";
import { AlertPopup } from "./AlertPopup";
import type { FaceLandmarksDetector } from "@tensorflow-models/face-landmarks-detection";
import { Button } from "./Button";
import * as tf from "@tensorflow/tfjs";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import { WarningModal } from "./WarningModal";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../store";
import { fetchQuestion } from "../../slice/questionSlice";

export default function PracticeTest() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const { eid, sid, cid } = useParams();
  const DEBUG = true;
  let frameCount = 0;
  let isProcessing = false;
  const [openAlert, setOpenAlert] = useState<boolean>(false);
  const [detector, setDetector] = useState<FaceLandmarksDetector | null>(null);
  const navigate = useNavigate();
  const [cheatingAlert, setCheatingAlert] = useState<boolean>(false);
  const [warning, setWarning] = useState("");
  const [violations, setViolations] = useState(0);
  const { data, error } = useSelector(
    (state: RootState) => state.questions ?? null,
  );
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchQuestion(cid));
  }, []);

  console.log("question", data);

  let lastViolationTime = 0;
  const VIOLATION_COOLDOWN = 2000;

  const stopCamera = () => {
    if (!videoRef.current) return;

    const stream = videoRef.current.srcObject as MediaStream;

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    videoRef.current.pause();
    videoRef.current.srcObject = null;
    videoRef.current.load();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    console.log("Camera fully detached at:", Date.now());
  };

  function handleBackButton() {
    setOpenAlert(true);
    stopCamera();
  }
  const registerViolation = (msg: string) => {
    const now = Date.now();

    if (now - lastViolationTime < VIOLATION_COOLDOWN) {
      return; // Ignore repeated violation within cooldown
    }

    lastViolationTime = now;

    console.log("🚨 Violation:", msg);

    setWarning(msg);

    setViolations((prev) => {
      const newCount = prev + 1;
      console.log("⚠️ Total Violations:", newCount);
      return newCount;
    });
  };

  const loadModel = async () => {
    // Make sure TF is ready (prevents silent crashes)
    console.log("🔄 Loading MediaPipe model...");
    await tf.setBackend("webgl");
    await tf.ready();

    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;

    const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig =
      {
        runtime: "mediapipe",
        solutionPath: "/mediapipe", // MUST exist in public folder
        maxFaces: 1,
        refineLandmarks: true,
      };

    const newDetector = await faceLandmarksDetection.createDetector(
      model,
      detectorConfig,
    );

    setDetector(newDetector);
    console.log("✅ Detector Loaded Successfully");
  };

  const detect = async () => {
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
            setCheatingAlert(true);
          } else if (gazeRatio > 0.75) {
            registerViolation("Looking Left 👀");
            setCheatingAlert(true);
          } else {
            setWarning("");
            setCheatingAlert(false);
          }
        }
      }
    } catch (err) {
      console.error("❌ Detection error:", err);
    }

    isProcessing = false;
    animationRef.current = requestAnimationFrame(detect);
  };

  const initialize = async () => {
    // await startCamera();
    // await loadModel();
  };

  const startCamera = async () => {
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

  useEffect(() => {
    initialize();
    // detect();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const confirmExit = () => {
    window.history.go(-1);
    navigate(-1);
  };
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        alert("Tab switching detected 🚨");
      }
    };
    // Push fake state so back button triggers popstate
    window.history.pushState(null, "", window.location.href);

    window.addEventListener("popstate", handleBackButton);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("popstate", handleBackButton);
    };
  }, []);

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col">
      <div className="w-50 h-50 absolute z-100 right-10">
        {/* <AdvancedProctoring
          videoRef={videoRef}
          detect={detect()}
          detector={detector}
          animationRef={animationRef}
        /> */}
      </div>
      <AlertPopup
        isOpen={openAlert}
        // onClose={()=>void}
        message="Are you sure you want to leave the exam.?"
        onClose={() => setOpenAlert(false)}
        children={
          <>
            <Button onClick={confirmExit} title="Yes" />
            <Button
              onClick={() => setOpenAlert(false)}
              title="Cancel"
              className="bg-white text-blue-500! border border-blue-500!"
            />
          </>
        }
        title={"Leave Exam"}
      />
      {/* Header */}
      <WarningModal isOpen={cheatingAlert} title={""} />
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3">
        <div className="max-w-360 mx-auto flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <span className="material-symbols-outlined text-primary">
                <NotebookTabs />
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Arithmetic: Percentage
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                Chapter Practice Test
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-slate-500 text-sm">
                timer
              </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                42:15
              </span>
            </div>

            <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm shadow-primary/20">
              Finish Test
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-360 mx-auto w-full grid sm:grid-cols-1 lg:grid-cols-12 gap-6 p-4 lg:p-8">
        {/* Left Sidebar */}
        <section className="lg:col-span-9 space-y-6">
          {data.map((el, i) => {
            return (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[600px]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-xl font-bold">Question {i + 1}</h2>
                </div>

                {/* Body */}
                <div className="p-8 flex-1">
                  <p className="text-lg mb-8">{el.question}</p>

                  <div className="space-y-4">
                    {el.options.flatMap((el, i) => (
                      <label
                        key={i}
                        className="flex items-center p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="q3"
                          className="size-5 text-primary focus:ring-primary"
                        />
                        <span className="ml-4 font-medium">{el.v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Right Sidebar */}
        <aside className="fixed right-10 space-y-6 w-[20%]  lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">
                <Grid2X2 />
              </span>
              Question Palette
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {data.map((_, i) => (
                <button
                  key={i}
                  className="aspect-square flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 font-bold text-sm"
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-primary">
                Test Progress
              </span>
              <span className="text-xs font-bold text-primary">12%</span>
            </div>
            <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-[12%]"></div>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
              3 of 25 questions completed
            </p>
          </div>

          {/* <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">
                  <Edit />
                </span>
                Quick Notepad
              </h3>
            </div>

            <div className="p-4 flex-1">
              <textarea
                placeholder="Scratch pad for calculations..."
                className="w-full h-48 lg:h-[400px] p-3 text-sm bg-background-light dark:bg-background-dark focus:ring-1 focus:ring-primary/20 rounded-lg resize-none font-mono"
              />
            </div>
          </div> */}
        </aside>
      </main>
    </div>
  );
}
