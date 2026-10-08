import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, ShieldCheck, Zap, Activity } from 'lucide-react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';


const CameraTracker = ({ onTelemetryUpdate }) => {
  const [isActive, setIsActive] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [fidgetValue, setFidgetValue] = useState(0);
  const [gazeDeviation, setGazeDeviation] = useState(0);
  const [emotionState, setEmotionState] = useState('Focused');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackerRef = useRef(null);
  const trackTaskRef = useRef(null);
  
  // Real telemetry tracking history
  const prevNosePos = useRef(null);
  const movementHistory = useRef([]);
  const gazeHistory = useRef([]);
  
  // Performance optimization refs (prevents 15fps React re-renders)
  const latestFidgetRef = useRef(1.0);
  const latestGazeRef = useRef(1.0);
  const latestEmotionRef = useRef('Focused');

  // Initialize WebRTC Video Stream & MediaPipe FaceMesh
  const startCamera = async () => {
    try {
      setPermissionError(null);
      setIsDemoMode(false);
      
      // Init real AI model
      const faceMesh = new FaceMesh({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }});
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      faceMesh.onResults(onResults);
      trackerRef.current = faceMesh;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 }
      });
      streamRef.current = stream;
      setIsActive(true);
    } catch (err) {
      console.warn('Camera access denied.', err);
      setPermissionError('Camera hardware unavailable.');
    }
  };

  const onResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Calculate Fidget (Nose movement velocity)
      const nose = landmarks[1];
      let currentMovement = 0;
      if (prevNosePos.current) {
         const dx = nose.x - prevNosePos.current.x;
         const dy = nose.y - prevNosePos.current.y;
         currentMovement = Math.sqrt(dx*dx + dy*dy) * 1500; 
      }
      prevNosePos.current = {x: nose.x, y: nose.y};
      
      movementHistory.current.push(currentMovement);
      if(movementHistory.current.length > 20) movementHistory.current.shift();
      const avgMovement = movementHistory.current.reduce((a,b)=>a+b,0)/movementHistory.current.length;
      
      // Gaze deviation logic (simplified using eye centers vs head bounding box)
      const leftEye = landmarks[468];
      const rightEye = landmarks[473];
      const eyeCenter = (leftEye.x + rightEye.x) / 2;
      const headCenter = nose.x;
      const gazeDiff = Math.abs(headCenter - eyeCenter) * 1200;
      
      gazeHistory.current.push(gazeDiff);
      if(gazeHistory.current.length > 20) gazeHistory.current.shift();
      const avgGaze = gazeHistory.current.reduce((a,b)=>a+b,0)/gazeHistory.current.length;
      
      const mappedFidget = Math.min(10, Math.max(1, avgMovement));
      const mappedGaze = Math.min(10, Math.max(1, avgGaze));
      
      // Update refs instead of state to prevent rendering lag
      latestFidgetRef.current = mappedFidget;
      latestGazeRef.current = mappedGaze;
      
      if (mappedGaze > 6) latestEmotionRef.current = 'Distracted';
      else if (mappedFidget > 6) latestEmotionRef.current = 'Restless';
      else latestEmotionRef.current = 'Focused';

      // Draw real Face Mesh tracking points
      ctx.fillStyle = mappedGaze > 6 ? 'rgba(245, 158, 11, 0.8)' : mappedFidget > 6 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
      for (let i = 0; i < landmarks.length; i+=4) {
         ctx.beginPath();
         ctx.arc(landmarks[i].x * canvas.width, landmarks[i].y * canvas.height, 1, 0, 2*Math.PI);
         ctx.fill();
      }
      
      // Draw Gaze Target Lines
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nose.x * canvas.width, nose.y * canvas.height);
      ctx.lineTo((nose.x + (eyeCenter - headCenter) * 10) * canvas.width, (nose.y - 0.1) * canvas.height);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Callback ref to bind webcam stream and start MediaPipe Camera loop
  const setVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current && trackerRef.current && !trackTaskRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(e => console.warn('Video play interrupted:', e));
      
      const camera = new MediaPipeCamera(node, {
        onFrame: async () => {
          if (trackerRef.current) {
            await trackerRef.current.send({image: node});
          }
        },
        width: 320,
        height: 240
      });
      camera.start();
      trackTaskRef.current = camera;
    }
  }, []);

  const stopCamera = () => {
    if (trackTaskRef.current) {
      trackTaskRef.current.stop();
      trackTaskRef.current = null;
    }
    if (trackerRef.current) {
      trackerRef.current.close();
      trackerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setFidgetValue(0);
    setGazeDeviation(0);
    setEmotionState('Inactive');
  };

  // Run real-time Telemetry state updates for parent
  useEffect(() => {
    if (!isActive) return;
    const intervalId = setInterval(() => {
      // Sync refs to React state exactly once per second
      setFidgetValue(latestFidgetRef.current);
      setGazeDeviation(latestGazeRef.current);
      setEmotionState(latestEmotionRef.current);
      
      onTelemetryUpdate({
        fidget_index: latestFidgetRef.current,
        gaze_deviation: latestGazeRef.current,
        tracked_expression: latestEmotionRef.current
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isActive, onTelemetryUpdate]);
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white/70 backdrop-blur-xl p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-slate-900 font-black text-lg tracking-tighter uppercase flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600 animate-pulse" /> Live Attention Scan
          </h4>
          <p className="text-slate-500 text-xs mt-0.5">Observe focus drift & behavioral hyperactivity metrics.</p>
        </div>
        <button
          onClick={isActive ? stopCamera : startCamera}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase transition-all duration-200 ${
            isActive
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100'
          }`}
        >
          {isActive ? (
            <>
              <CameraOff className="w-3.5 h-3.5" /> Stop Scan
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" /> Start Scan
            </>
          )}
        </button>
      </div>

      {permissionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold mb-4">
          ⚠️ {permissionError}
        </div>
      )}

      {/* Frame Container */}
      <div className="relative flex justify-center items-center bg-slate-950 rounded-3xl aspect-[4/3] overflow-hidden group shadow-inner">
        {!isActive ? (
          <div className="absolute inset-0 flex flex-col justify-center items-center p-8 text-center bg-slate-900/40">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-700/50">
              <CameraOff className="w-6 h-6" />
            </div>
            <span className="text-slate-200 font-bold text-sm tracking-tight">Camera Feed Inactive</span>
            <span className="text-slate-400 text-xs max-w-xs mt-1.5 leading-relaxed">
              Activate your camera to measure real-time focus gaze metrics during the screening.
            </span>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Native Video Node (Visible, mirrored for natural feel) */}
            {!isDemoMode && (
              <video
                ref={setVideoRef}
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}
            {/* Telemetry Graphic Overlay */}
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${!isDemoMode ? 'scale-x-[-1]' : ''}`}
            />
          </div>
        )}
      </div>

      {/* Realtime Telemetry Data Meters */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gaze Drift Rate</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">{isActive ? gazeDeviation.toFixed(1) : '--'}</span>
            {isActive && (
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                gazeDeviation > 6.5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {gazeDeviation > 6.5 ? 'Wandering' : 'Steady'}
              </span>
            )}
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${gazeDeviation > 6.5 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              style={{ width: `${isActive ? gazeDeviation * 10 : 0}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Fidget Index (Motion)</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">{isActive ? fidgetValue.toFixed(1) : '--'}</span>
            {isActive && (
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                fidgetValue > 6.0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {fidgetValue > 6.0 ? 'High' : 'Low'}
              </span>
            )}
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${fidgetValue > 6.0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${isActive ? fidgetValue * 10 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Educational Explanation Box */}
      <div className="mt-6 p-5 rounded-[1.5rem] bg-indigo-50/50 border border-indigo-100/50 space-y-3">
        <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> What does this track?
        </h5>
        <div className="space-y-2 text-slate-600 text-[11px] font-medium leading-relaxed">
          <p>
            👁️ <span className="font-bold text-slate-800">Gaze Drift Rate</span>: Detects when your eyes look away from the test area. High drift signals attention lapses (Inattention).
          </p>
          <p>
            🏃 <span className="font-bold text-slate-800">Fidget Index (Motion)</span>: Measures physical movement velocity (frame pixel changes) indicating hyperactivity and motor restlessness.
          </p>
          <p className="text-[10px] text-slate-400 italic font-bold">
            Integrates into the diagnostic model (15% impact weight) to enrich subjective question answers with objective behavioral telemetry.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-4 justify-center">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> All frames processed locally. No video stream leaves your browser.
      </div>
    </div>
  );
};

export default CameraTracker;
