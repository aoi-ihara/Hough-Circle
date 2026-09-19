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

const TOTAL_ROUNDS = 3;
const WIN_SCORE = 85;

function drawStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    progress = 0,
    detection: CircleDetection | null = null,
    dashed = false,
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

    ctx.strokeStyle = dashed ? "rgba(255, 255, 255, 0.5)" : "#ffffff";
    ctx.lineWidth = dashed ? 2 : 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (dashed) ctx.setLineDash([8, 8]);

    ctx.stroke();

    if (dashed) ctx.setLineDash([]);
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
        drawStroke(ctx, points);

        if (detection) {
            const eased =
                1 - Math.pow(1 - Math.max(0, Math.min(morphProgress, 1)), 3);

            const centerX = detection.center.x;
            const centerY = detection.center.y;
            const pulse = (1 - eased) * Math.sin(time / 180) * 5;
            const radius = detection.radius + pulse;

            drawStroke(ctx, points, morphProgress, detection, true);

            ctx.save();

            ctx.globalAlpha = 0.5;
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

                ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    } else if (phase === "idle") {
        drawStroke(ctx, points);
    } else if (phase === "revealed" && detection) {
        drawStroke(ctx, points);
        drawStroke(ctx, points, 1, detection, true);
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

    const [result, setResult] = useState<CircleDetection | null>(null);

    const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>("idle");

    const [displayScore, setDisplayScore] = useState(0);

    const [message, setMessage] = useState("真円を書いて下さい。");

    const [round, setRound] = useState(1);
    const [finalMaxScore, setFinalMaxScore] = useState(0);
    const [scores, setScores] = useState<number[]>([]);

    const [finished, setFinished] = useState(false);

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
            if (analysisTimeoutRef.current !== null) {
                window.clearTimeout(analysisTimeoutRef.current);
            }

            if (scoreAnimationRef.current !== null) {
                cancelAnimationFrame(scoreAnimationRef.current);
            }
        };
    }, []);

    const startNextRound = () => {
        pointsRef.current = [];
        detectionRef.current = null;

        setResult(null);
        setDisplayScore(0);
        setAnalysisPhase("idle");
        setMessage("真円を書いて下さい。");
    };

    const revealScore = (detection: CircleDetection) => {
        setResult(detection);
        setAnalysisPhase("revealed");
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

        if (round === TOTAL_ROUNDS) {
            const finalScores = [...scores, detection.score];
            const bestScore = Math.max(...finalScores);

            setFinalMaxScore(bestScore);

            window.setTimeout(() => {
                setFinished(true);

                if (bestScore > WIN_SCORE) {
                    setMessage("勝利！");
                } else {
                    setMessage("ゲームオーバー");
                }
            }, 850);
        } else {
            window.setTimeout(() => {
                setScores((current) => [...current, detection.score]);
                setRound((current) => current + 1);
                startNextRound();
            }, 1400);
        }
    };

    const finish = () => {
        if (analysisPhase === "analyzing" || finished) return;

        drawingRef.current = false;

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

                drawCanvas(
                    canvas,
                    pointsRef.current,
                    detection,
                    "revealed",
                    performance.now(),
                    1,
                );
            } else {
                setAnalysisPhase("failed");
                setMessage("もう一度描いて下さい。");

                drawCanvas(canvas, pointsRef.current, null, "failed");
            }
        }, 1050);
    };

    const handlePointerDown = (
        event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
        if (result || analysisPhase === "analyzing" || finished) {
            return;
        }

        const point = getPoint(event.nativeEvent);

        if (!point) return;

        event.currentTarget.setPointerCapture(event.pointerId);

        pointsRef.current = [point];
        drawingRef.current = true;

        setAnalysisPhase("idle");
        detectionRef.current = null;
        setMessage("その調子です…");

        drawCanvas(event.currentTarget, pointsRef.current, null, "idle");
    };

    const handlePointerMove = (
        event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
        if (
            !drawingRef.current ||
            result ||
            analysisPhase === "analyzing" ||
            finished
        ) {
            return;
        }

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
                <section className="flex flex-1 flex-col items-center gap-8">
                    <div className="my-4 h-16 flex w-full items-center justify-between gap-0">
                        <div className="text-2xl font-bold tracking-wider">
                            {message}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-3">
                                {scores.map((score, index) => (
                                    <div
                                        key={index}
                                        className="text-right opacity-50 animate-appear"
                                    >
                                        <div className="w-8 flex flex-col items-center">
                                            <div className="mt-1 font-mono text-sm font-bold">
                                                R{index + 1}
                                            </div>

                                            <div className="font-mono text-2xl font-bold leading-none">
                                                {score}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {result && (
                                    <div className="text-right flex flex-col items-center opacity-100 scale-150 px-3">
                                        <div className="w-8 flex flex-col items-center">
                                            <div className="mt-1 font-mono text-sm font-bold">
                                                R{scores.length + 1}
                                            </div>

                                            <div className="font-mono text-2xl font-bold leading-none">
                                                {displayScore}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end opacity-50 flex-col h-16 w-full">
                                <div className="font-mono font-bold">/ 100</div>
                            </div>
                        </div>
                    </div>

                    <div className="aspect-square w-2xl">
                        <canvas
                            ref={canvasRef}
                            className={`aspect-square h-full w-full touch-none ${
                                result || finished
                                    ? "cursor-default"
                                    : "cursor-crosshair"
                            }`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                            aria-label="Circle drawing canvas"
                        />

                        {!result &&
                            !finished &&
                            analysisPhase !== "analyzing" && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="rounded-full border border-white/25 px-5 py-3 text-sm text-white/50">
                                        円を描いて下さい
                                    </div>
                                </div>
                            )}
                    </div>

                    <div className="h-32 flex flex-col items-center gap-8">
                        {finished && (
                            <div className="text-center gap-2 flex items-center">
                                <div className="font-mono opacity-50">
                                    Best Score
                                </div>

                                <div className="font-mono text-4xl font-bold tabular-nums">
                                    {finalMaxScore}
                                </div>
                            </div>
                        )}

                        <Button
                            iconName="home"
                            className={finished ? "opacity-100" : "opacity-0"}
                            onClick={() => {
                                if (finished) {
                                    router.push("/");
                                }
                            }}
                        >
                            ホームに戻る
                        </Button>
                    </div>
                </section>
            </div>
        </main>
    );
}
