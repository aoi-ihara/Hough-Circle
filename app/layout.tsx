import type { Metadata } from "next";
import "./globals.css";
import { CustomCursor } from "@/components/layout/CustomCursor";
import { Footer } from "@/components/layout/Footer";
import { LINE_Seed_JP, JetBrains_Mono } from "next/font/google";

const lineSeedJp = LINE_Seed_JP({
    subsets: ["latin"],
    weight: ["100", "400", "700", "800"],
    variable: "--font-line-seed-jp",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--jetbrains-mono",
});

export const metadata: Metadata = {
    title: "Hough Circle",
    description:
        "手書きした円をHough変換で解析し、どれくらい真円に近いかを判定するツール。",
    openGraph: {
        title: "Hough Circle",
        description:
            "手書きした円をHough変換で解析し、どれくらい真円に近いかを判定するツール。",
        url: "https://hough-circle.vgnz93hs.com",
        siteName: "Hough Circle",
    },
    icons: {
        apple: "/apple-icon.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body
                className={`${lineSeedJp.variable} ${jetbrainsMono.variable} min-h-full flex flex-col`}
            >
                <CustomCursor />
                <main className="flex flex-col h-dvh w-full items-center">
                    {children}
                    <div className="text-xs w-full flex fixed opacity-50 justify-center md:justify-start bottom-3">
                        <Footer />
                    </div>
                </main>
            </body>
        </html>
    );
}
