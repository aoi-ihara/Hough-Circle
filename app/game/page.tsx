"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    detectCircle,
    type Point,
    type CircleDetection,
} from "@/lib/houghCircle";
import Button from "@/components/ui/Button";

type AnalysisPhase = "idle" | "analyzing" | "revealed" | "failed";

function drawStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    progress = 0,
    detection: CircleDetection | null = null,
) {
    if (points.length < 2) return;

    const eased = 1 - Math.pow(1 - Math.max(0, Math.min(progress, 1)), 3);
    const morphCenter = detection?.center;
    const morphRadius = detection?.radius ?? 0;

    ctx.beginPath();
    for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        let x = point.x;
        let y = point.y;

        if (morphCenter && morphRadius > 0) {
            const dx = point.x - morphCenter.x;
            const dy = point.y - morphCenter.y;
            const distance = Math.hypot(dx, dy);

            if (distance > 0.001) {
                const targetX = morphCenter.x + (dx / distance) * morphRadius;
                const targetY = morphCenter.y + (dy / distance) * morphRadius;
                x += (targetX - x) * eased;
                y += (targetY - y) * eased;
            }
        }

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
}

function drawCanvas(
    canvas: HTMLCanvasElement,
    points: Point[],
    detection: CircleDetection | null,
    phase: AnalysisPhase,
    time = 0,
    morphProgress = 0,
) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (phase === "analyzing") {
        drawStroke(ctx, points, morphProgress, detection);

        if (detection) {
            const eased = 1 - Math.pow(1 - Math.max(0, Math.min(morphProgress, 1)), 3);
            const centerX = detection.center.x;
            const centerY = detection.center.y;
            const pulse = (1 - eased) * Math.sin(time / 180) * 5;
            const radius = detection.radius + pulse;

            ctx.save();
            ctx.globalAlpha = 0.12 + eased * 0.1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 12]);
            ctx.lineDashOffset = -time / 18;
            ctx.stroke();
            ctx.restore();

            if (eased > 0.35) {
                ctx.beginPath();
                ctx.moveTo(centerX - 14, centerY);
                ctx.lineTo(centerX + 14, centerY);
                ctx.moveTo(centerX, centerY - 14);
                ctx.lineTo(centerX, centerY + 14);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    } else if (phase === "idle") {
        drawStroke(ctx, points);
    } else if (phase === "revealed" && detection) {
        drawStroke(ctx, points);
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
    } else if (phase === "failed") {
        drawStroke(ctx, points);
    }
}

export default function Game() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointsRef = useRef<Point[]>([]);
    const drawingRef = useRef(false);
    const detectionRef = useRef<CircleDetection | null>(null);
    const analysisTimeoutRef = useRef<number | null>(null);
    const scoreAnimationRef = useRef<number | null>(null);
    const analysisStartedAtRef = useRef<number | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [result, setResult] = useState<CircleDetection | null>(null);
    const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("idle");
    const [displayScore, setDisplayScore] = useState(0);
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
            drawCanvas(
                canvas,
                pointsRef.current,
                detectionRef.current,
                analysisPhase,
            );
        };

        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, [analysisPhase]);

    useEffect(() => {
        if (analysisPhase !== "analyzing") return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        let animationFrame = 0;
        const start = analysisStartedAtRef.current ?? performance.now();
        analysisStartedAtRef.current = start;

        const animate = (time: number) => {
            const progress = Math.min((time - start) / 950, 1);
            drawCanvas(
                canvas,
                pointsRef.current,
                detectionRef.current,
                "analyzing",
                time,
                progress,
            );
            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [analysisPhase]);

    useEffect(() => {
        return () => {
            if (analysisTimeoutRef.current !== null)
                window.clearTimeout(analysisTimeoutRef.current);
            if (scoreAnimationRef.current !== null)
                cancelAnimationFrame(scoreAnimationRef.current);
        };
    }, []);

    const revealScore = (detection: CircleDetection) => {
        setResult(detection);
        setAnalysisPhase("revealed");
        setMessage("解析完了");
        setDisplayScore(0);

        const start = performance.now();
        const duration = 720;
        const animateScore = (time: number) => {
            const progress = Math.min((time - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayScore(Math.round(detection.score * eased));

            if (progress < 1) {
                scoreAnimationRef.current = requestAnimationFrame(animateScore);
            }
        };

        scoreAnimationRef.current = requestAnimationFrame(animateScore);
    };

    const finish = () => {
        if (analysisPhase === "analyzing") return;

        drawingRef.current = false;
        setDrawing(false);
        setResult(null);
        setDisplayScore(0);
        setAnalysisPhase("analyzing");
        setMessage("解析しています…");
        analysisStartedAtRef.current = performance.now();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const detection = detectCircle(
            pointsRef.current,
            canvas.width,
            canvas.height,
        );
        detectionRef.current = detection;

        analysisTimeoutRef.current = window.setTimeout(() => {
            if (detection) {
                revealScore(detection);
                drawCanvas(canvas, pointsRef.current, detection, "revealed");
            } else {
                setAnalysisPhase("failed");
                setMessage("円を検知できませんでした。もう一度描いて下さい。");
                drawCanvas(canvas, pointsRef.current, null, "failed");
            }
        }, 1050);
    };

    const handlePointerDown = (
        event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
        if (result || analysisPhase === "analyzing") return;
        const point = getPoint(event.nativeEvent);
        if (!point) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pointsRef.current = [point];
        drawingRef.current = true;
        setDrawing(true);
        setAnalysisPhase("idle");
        detectionRef.current = null;
        setMessage("その調子です…");
        drawCanvas(event.currentTarget, pointsRef.current, null, "idle");
    };

    const handlePointerMove = (
        event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
        if (!drawingRef.current || result || analysisPhase === "analyzing") return;
        const point = getPoint(event.nativeEvent);
        if (!point) return;

        const points = pointsRef.current;
        const previous = points[points.length - 1];
        if (
            !previous ||
            Math.hypot(point.x - previous.x, point.y - previous.y) >= 2
        ) {
            points.push(point);
            drawCanvas(event.currentTarget, points, null, "idle");
        }
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        finish();
    };

    const handlePointerCancel = () => {
        if (!drawingRef.current) return;
        finish();
    };

    return (
        <main className="min-h-screen flex items-center sm:px-8">
            <div className="mx-auto flex w-full max-w-5xl flex-col">
                <section className="flex items-center flex-1 flex-col gap-8">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="text-4xl tracking-wider my-4 font-bold transition-opacity duration-200">
                            {message}
                        </div>
                        {result && (
                            <div className="text-right flex gap-2 items-end">
                                <div className="font-mono text-6xl font-bold leading-none tabular-nums">
                                    {displayScore}
                                </div>
                                <div className="mt-2 font-mono font-bold uppercase tracking-[0.22em]">
                                    / 100
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-2xl aspect-square">
                        <canvas
                            ref={canvasRef}
                            className={`h-full aspect-square w-full touch-none ${result ? "cursor-default" : "cursor-crosshair"}`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                            aria-label="Circle drawing canvas"
                        />
                        {!drawing && !result && analysisPhase !== "analyzing" && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="rounded-full border border-white/25 px-5 py-3 text-sm text-white/50">
                                    円を描いて下さい
                                </div>
                            </div>
                        )}
                    </div>

                    {result && (
                        <Button
                            iconName="home"
                            onClick={() => router.push("/")}
                        >
                            ホームに戻る
                        </Button>
                    )}
                </section>
            </div>
        </main>
    );
}
