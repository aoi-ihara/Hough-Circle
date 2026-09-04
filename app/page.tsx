import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <div className="font-mono text-sm font-semibold tracking-tight text-white/60">
            HOUGH-CIRCLE
          </div>
          <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/40">
            Prototype
          </div>
        </header>

        <section className="flex flex-col items-center gap-10 py-20 text-center">
          <div className="space-y-5">
            <p className="font-mono text-sm uppercase tracking-[0.3em] text-white/35">
              Draw your perfect circle
            </p>
            <h1 className="text-6xl font-semibold tracking-[-0.055em] text-white sm:text-8xl">
              How round are you?
            </h1>
            <p className="mx-auto max-w-xl text-base leading-7 text-white/50 sm:text-lg">
              Draw a circle freehand. Release the mouse and a Hough transform will estimate your circle and score how close it is to a true circle.
            </p>
          </div>

          <Link
            href="/game"
            className="group inline-flex h-14 items-center gap-3 rounded-full bg-white px-7 text-sm font-semibold text-black transition-transform duration-200 hover:scale-[1.03] active:scale-95"
          >
            Play
            <span className="text-black/40 transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        </section>

        <footer className="flex items-center justify-center pb-2 text-xs text-white/25">
          Draw slowly or quickly. There is no perfect technique.
        </footer>
      </div>
    </main>
  );
}
