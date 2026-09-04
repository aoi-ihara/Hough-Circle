"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { detectCircle, type Point, type CircleDetection } from "@/lib/houghCircle";

export default function Game() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState<CircleDetection | null>(null);
  const [message, setMessage] = useState("Draw a circle, then release.");

  const getPoint = (event: PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const draw = (points: Point[], detection: CircleDetection | null = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    if (detection) {
      ctx.beginPath();
      ctx.arc(detection.center.x, detection.center.y, detection.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      draw(pointsRef.current, result);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [result]);

  const finish = () => {
    drawingRef.current = false;
    setDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const detection = detectCircle(pointsRef.current, canvas.width, canvas.height);
    setResult(detection);
    if (detection) {
      setMessage("Hough transform complete.");
      draw(pointsRef.current, detection);
    } else {
      setMessage("I could not find a reliable circle. Try again.");
      draw(pointsRef.current);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (result) return;
    const point = getPoint(event.nativeEvent);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointsRef.current = [point];
    drawingRef.current = true;
    setDrawing(true);
    setMessage("Keep going…");
    draw(pointsRef.current);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || result) return;
    const point = getPoint(event.nativeEvent);
    if (!point) return;

    const points = pointsRef.current;
    const previous = points[points.length - 1];
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 2) {
      points.push(point);
      draw(points);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    finish();
  };

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between pb-6">
          <button
            onClick={() => router.push("/")}
            className="font-mono text-sm text-white/45 transition-colors hover:text-white"
          >
            ← Hough-Circle
          </button>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-white/25">
            Hough Transform
          </div>
        </header>

        <section className="flex flex-1 flex-col gap-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-white/35">Draw one continuous stroke</p>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                {message}
              </h1>
            </div>
            {result && (
              <div className="text-right">
                <div className="font-mono text-7xl font-semibold leading-none tracking-[-0.06em] text-white sm:text-8xl">
                  {result.score}
                </div>
                <div className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-white/30">/ 100</div>
              </div>
            )}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-[#101114] shadow-2xl shadow-black/30">
            <canvas
              ref={canvasRef}
              className={`h-full min-h-[58vh] w-full touch-none ${result ? "cursor-default" : "cursor-crosshair"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={finish}
              aria-label="Circle drawing canvas"
            />
            {!drawing && !result && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/30">
                  Start anywhere
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-white">Circle detected</p>
                <p className="mt-1 text-sm text-white/40">
                  Radial error: {result.error.toFixed(1)} px · Coverage: {Math.round(result.coverage * 100)}%
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-95"
              >
                Play Again
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
