import { useRef, useState, useEffect, useCallback } from 'react';

interface EyeTrackingProps {
  isActive: boolean;
  onGaze: (x: number, y: number) => void;
}

const FACE_LANDMARKER_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export const EyeTracking: React.FC<EyeTrackingProps> = ({ isActive, onGaze }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const animRef = useRef<number>(0);
  const [error, setError] = useState('');
  const [calibrating, setCalibrating] = useState(true);
  const [calibrationPoints, setCalibrationPoints] = useState<{ sx: number; sy: number; gx: number; gy: number }[]>([]);
  const calPhaseRef = useRef(0);
  const gazeRef = useRef({ x: 0.5, y: 0.5 });
  const onGazeRef = useRef(onGaze);
  useEffect(() => { onGazeRef.current = onGaze; }, [onGaze]);

  const estimateGaze = useCallback((landmarks: { x: number; y: number; z: number }[]) => {
    if (landmarks.length < 478) return;
    const leftEye = [33, 133, 157, 158, 159, 160, 161, 173];
    const rightEye = [362, 263, 384, 385, 386, 387, 388, 466];
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];

    const leftEyeCenter = leftEye.reduce((acc, i) => ({ x: acc.x + landmarks[i].x, y: acc.y + landmarks[i].y }), { x: 0, y: 0 });
    leftEyeCenter.x /= leftEye.length;
    leftEyeCenter.y /= leftEye.length;

    const rightEyeCenter = rightEye.reduce((acc, i) => ({ x: acc.x + landmarks[i].x, y: acc.y + landmarks[i].y }), { x: 0, y: 0 });
    rightEyeCenter.x /= rightEye.length;
    rightEyeCenter.y /= rightEye.length;

    const leftGaze = { x: (leftIris.x - leftEyeCenter.x) * 5, y: (leftIris.y - leftEyeCenter.y) * 5 };
    const rightGaze = { x: (rightIris.x - rightEyeCenter.x) * 5, y: (rightIris.y - rightEyeCenter.y) * 5 };

    const gazeX = Math.max(-1, Math.min(1, (leftGaze.x + rightGaze.x) / 2));
    const gazeY = Math.max(-1, Math.min(1, (leftGaze.y + rightGaze.y) / 2));

    return { x: gazeX, y: gazeY };
  }, []);

  useEffect(() => {
    if (!isActive) {
      setError('');
      setCalibrating(true);
      setCalibrationPoints([]);
      calPhaseRef.current = 0;
      return;
    }

    let stream: MediaStream | null = null;

    async function init() {
      try {
        const vision = await (window as any).FilesetResolver?.forVisionTasks?.(FACE_LANDMARKER_URL);
        if (!vision) {
          const mod = await import('@mediapipe/tasks-vision');
          const resolver = await mod.FilesetResolver.forVisionTasks(FACE_LANDMARKER_URL);
          const detector = await mod.FaceLandmarker.createFromOptions(resolver, {
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
          });
          detectorRef.current = detector;
        } else {
          const mod = await import('@mediapipe/tasks-vision');
          const detector = await mod.FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numFaces: 1,
          });
          detectorRef.current = detector;
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        setError(err.message || 'Error al iniciar eye tracking');
      }
    }

    init();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !detectorRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    let lastTime = 0;

    function processFrame(time: number) {
      const detector = detectorRef.current;
      if (!detector || !video || video.readyState < 2) {
        animRef.current = requestAnimationFrame(processFrame);
        return;
      }
      if (time - lastTime < 100) {
        animRef.current = requestAnimationFrame(processFrame);
        return;
      }
      lastTime = time;
      const result = detector.detectForVideo(video, time);
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const lm = result.faceLandmarks[0];
        const gaze = estimateGaze(lm);
        if (gaze) {
          gazeRef.current = gaze;
          const sx = (gaze.x + 1) / 2;
          const sy = (gaze.y + 1) / 2;
          onGazeRef.current(sx, sy);

          if (calPhaseRef.current < 5) {
            setCalibrationPoints(prev => [...prev, { sx, sy, gx: gaze.x, gy: gaze.y }]);
            calPhaseRef.current++;
            if (calPhaseRef.current >= 5) setCalibrating(false);
          }

          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const w = canvasRef.current.width;
              const h = canvasRef.current.height;
              ctx.clearRect(0, 0, w, h);
              ctx.fillStyle = 'rgba(0,255,100,0.6)';
              ctx.beginPath();
              ctx.arc(sx * w, sy * h, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,0.3)';
              ctx.font = '8px monospace';
              ctx.fillText(`gaze: ${(sx * 100).toFixed(0)}%,${(sy * 100).toFixed(0)}%`, 4, 12);
            }
          }
        }
      }
      animRef.current = requestAnimationFrame(processFrame);
    }

    animRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive, estimateGaze]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex gap-2 items-end">
      <div className="relative w-48 h-36 rounded-xl overflow-hidden border-2 border-green-500/50 bg-black shadow-xl">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" width={320} height={240} />
        {calibrating && (
          <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[9px] font-bold text-yellow-400">
            Calibrando... mira al centro
          </div>
        )}
      </div>
      {error && (
        <div className="bg-red-500/90 text-white text-[9px] px-2 py-1 rounded-lg max-w-32">
          {error}
        </div>
      )}
    </div>
  );
};
