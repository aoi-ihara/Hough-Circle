"use client";

import { useEffect, useRef } from "react";
import Shell from "@/components/layout/Shell";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useRouter } from "next/navigation";

const circles = [
    { radius: 90, speed: 0.00025, dash: [10, 10], width: 1 },
    { radius: 150, speed: -0.00018, dash: [10, 10], width: 1 },
    { radius: 220, speed: 0.00014, dash: [10, 10], width: 1 },
    { radius: 310, speed: -0.0001, dash: [10, 10], width: 1 },
    { radius: 420, speed: 0.00008, dash: [10, 10], width: 1 },
];

function CircleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const context = canvas.getContext("2d");

        if (!context) {
            return;
        }

        let animationFrame = 0;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;

            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;

            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;

            context.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const draw = (time: number) => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            context.clearRect(0, 0, width, height);

            const centerX = width / 2;
            const centerY = height / 2;

            circles.forEach((circle) => {
                context.save();

                context.translate(centerX, centerY);
                context.rotate(time * circle.speed);

                context.beginPath();
                context.setLineDash(circle.dash);
                context.lineWidth = circle.width;
                context.strokeStyle = "rgba(0, 0, 0, 0.15)";

                context.arc(0, 0, circle.radius, 0, Math.PI * 2);

                context.stroke();
                context.restore();
            });

            animationFrame = requestAnimationFrame(draw);
        };

        resize();
        window.addEventListener("resize", resize);
        animationFrame = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
        />
    );
}

export default function Home() {
    const router = useRouter();

    return (
        <Shell title="Hough Circle" size="small">
            <CircleCanvas />

            <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-2">
                    <Icon name="loaderCircle" className="shrink-0" />
                    マウスを使って出来る限りの真円を描きます。
                </div>
                <div className="flex gap-2">
                    <Icon name="cpu" className="shrink-0" />
                    「ハフ変換」によってどれくらい真円であるかが測定されます。
                </div>
                <div className="flex gap-2">
                    <Icon name="medal" className="shrink-0" />
                    3回行なって、最高得点が80を超えたら勝ちです。
                </div>
            </div>

            <Button
                onClick={() => router.push("/game")}
                className="w-full"
                iconName="play"
            >
                Play
            </Button>
        </Shell>
    );
}
