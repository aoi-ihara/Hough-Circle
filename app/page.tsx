"use client";

import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();
    return (
        <main className="min-h-screen px-6 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-between">
                <section className="flex flex-col items-center gap-16 py-20 text-center">
                    <div
                        className="font-mono tracking-wider text-2xl font-bold"
                        data-cursor="text"
                    >
                        Hough Circle
                    </div>
                    <p
                        className="mx-auto max-w-xl text-start leading-loose tracking-wider"
                        data-cursor="text"
                    >
                        フリーハンドで円を描いてみてください。マウスを離すと、ハフ変換によってあなたの描いた円が推定され、本物の円にどれだけ近いかがスコア（点数）で評価されます。
                    </p>
                    <Button
                        className="w-48"
                        iconName="play"
                        onClick={() => router.push("/game")}
                    >
                        プレイ
                    </Button>
                </section>
            </div>
        </main>
    );
}
