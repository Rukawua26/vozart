import { useRef, useState, useEffect, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface HandTrackingProps {
  isActive: boolean;
  onGesture: (gesture: HandGesture) => void;
}

export type HandGesture = 'none' | 'open' | 'pinch' | 'fist' | 'point';

const GESTURE_LABELS: Record<HandGesture, string> = {
  none: 'Sin gesto',
  open: 'Mano abierta (dibujar)',
  pinch: 'Pellizco (mover)',
  fist: 'Puño (pausa)',
  point: 'Señalar (seleccionar)',
};

function detectGesture(landmarks: { x: number; y: number; z: number }[]): HandGesture {
  if (landmarks.length < 21) return 'none';
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const thumbIndexDist = dist(thumbTip, indexTip);
  if (thumbIndexDist < 0.05) return 'pinch';

  const fingersExtended = [indexTip, middleTip, ringTip, pinkyTip].filter(
    f => f.y < indexPip.y
  ).length;

  if (fingersExtended >= 3) return 'open';
  if (fingersExtended === 1) return 'point';
  if (fingersExtended === 0) return 'fist';
  return 'none';
}

const HAND_LANDMARKER_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export const HandTracking: React.FC<HandTrackingProps> = ({ isActive, onGesture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animRef = useRef<number>(0);
  const [landmarks, setLandmarks] = useState<{ x: number; y: number; z: number }[]>([]);
  const [currentGesture, setCurrentGesture] = useState<HandGesture>('none');
  const [error, setError] = useState('');

  const drawLandmarks = useCallback((lm: { x: number; y: number; z: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (lm.length === 0) return;
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    const w = canvas.width;
    const h = canvas.height;
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ];
    for (const [a, b] of connections) {
      ctx.beginPath();
      ctx.moveTo((1 - lm[a].x) * w, lm[a].y * h);
      ctx.lineTo((1 - lm[b].x) * w, lm[b].y * h);
      ctx.stroke();
    }
    for (let i = 0; i < lm.length; i++) {
      const radius = i === 8 ? 8 : 4;
      ctx.beginPath();
      ctx.arc((1 - lm[i].x) * w, lm[i].y * h, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      setLandmarks([]);
      setCurrentGesture('none');
      setError('');
      return;
    }

    let stream: MediaStream | null = null;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(HAND_LANDMARKER_URL);
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
        });
        handLandmarkerRef.current = handLandmarker;

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        setError(err.message || 'Error al iniciar hand tracking');
      }
    }

    init();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !handLandmarkerRef.current) return;

    const video = videoRef.current;
    if (!video) return;

    let lastTime = 0;

    function processFrame(time: number) {
      const hl = handLandmarkerRef.current;
      if (!hl || !video || video.readyState < 2) {
        animRef.current = requestAnimationFrame(processFrame);
        return;
      }
      if (time - lastTime < 100) {
        animRef.current = requestAnimationFrame(processFrame);
        return;
      }
      lastTime = time;
      const result = hl.detectForVideo(video, time);
      if (result.landmarks && result.landmarks.length > 0) {
        const lm = result.landmarks[0];
        setLandmarks(lm);
        drawLandmarks(lm);
        const gesture = detectGesture(lm);
        setCurrentGesture(gesture);
        onGesture(gesture);
      } else {
        setLandmarks([]);
        drawLandmarks([]);
      }
      animRef.current = requestAnimationFrame(processFrame);
    }

    animRef.current = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive, onGesture, drawLandmarks]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2 items-end">
      <div className="relative w-48 h-36 rounded-xl overflow-hidden border-2 border-blue-500/50 bg-black shadow-xl">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" width={320} height={240} />
        {currentGesture !== 'none' && (
          <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[9px] font-bold text-green-400">
            {GESTURE_LABELS[currentGesture]}
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
