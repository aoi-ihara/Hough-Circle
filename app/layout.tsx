import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hough Circle",
  description: "Draw a circle. Let the Hough transform judge it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
