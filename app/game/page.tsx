"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    detectCircle,
    type Point,
    type CircleDetection,
} from "@/lib/houghCircle";

function drawCanvas(
    canvas: HTMLCanvasElement,
    points: Point[],
    detection: CircleDetection | null,
) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1)
            ctx.lineTo(points[i].x, points[i].y);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    }

    if (detection) {
        ctx.beginPath();
        ctx.arc(
            detection.center.x,
            detection.center.y,
            detection.radius,
            0,
            Math.PI * 2,
        );
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

export default function Game() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointsRef = useRef<Point[]>([]);
    const drawingRef = useRef(false);
    const [drawing, setDrawing] = useState(false);
    const [result, setResult] = useState<CircleDetection | null>(null);
    const [message, setMessage] = useState("真円を書いて下さい。");

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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.floor(rect.width * dpr));
            canvas.height = Math.max(1, Math.floor(rect.height * dpr));
            drawCanvas(canvas, pointsRef.current, result);
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

        const detection = detectCircle(
            pointsRef.current,
            canvas.width,
            canvas.height,
        );
        setResult(detection);
        if (detection) {
            setMessage("判定の結果…");
            drawCanvas(canvas, pointsRef.current, detection);
        } else {
            setMessage("円を検知できませんでした。もう一度描いて下さい。");
            drawCanvas(canvas, pointsRef.current, null);
        }
    };

    const handlePointerDown = (
        event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
        if (result) return;
        const point = getPoint(event.nativeEvent);
        if (!point) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointsRef.current = [point];
        drawingRef.current = true;
        setDrawing(true);
        setMessage("その調子です…");
        drawCanvas(event.currentTarget, pointsRef.current, null);
    };

    const handlePointerMove = (
        event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
        if (!drawingRef.current || result) return;
        const point = getPoint(event.nativeEvent);
        if (!point) return;

        const points = pointsRef.current;
        const previous = points[points.length - 1];
        if (
            !previous ||
            Math.hypot(point.x - previous.x, point.y - previous.y) >= 2
        ) {
            points.push(point);
            drawCanvas(event.currentTarget, points, null);
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
                <section className="flex flex-1 flex-col gap-5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-4xl tracking-wider my-8 font-bold">
                            {message}
                        </div>
                        {result && (
                            <div className="text-right flex gap-2 items-end">
                                <div className="font-mono text-6xl font-bold leading-none">
                                    {result.score}
                                </div>
                                <div className="mt-2 font-mono font-bold uppercase tracking-[0.22em]">
                                    / 100
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-4xl aspect-square">
                        <canvas
                            ref={canvasRef}
                            className={`h-full aspect-square min-h-[58vh] w-full touch-none ${result ? "cursor-default" : "cursor-crosshair"}`}
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
                        <div className="flex flex-col gap-4 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-medium text-white">
                                    Circle detected
                                </p>
                                <p className="mt-1 text-sm text-white/40">
                                    Radial error: {result.error.toFixed(1)} px ·
                                    Coverage:{" "}
                                    {Math.round(result.coverage * 100)}%
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
