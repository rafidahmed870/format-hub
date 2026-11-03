import { useEffect, useState } from "react";

function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000;
    const startTime = performance.now();

    let animationFrame: number;

    const updateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const percentage = Math.min((elapsed / duration) * 100, 100);

      setProgress(percentage);

      if (percentage >= 100) {
        onComplete?.();
        return;
      }

      animationFrame = requestAnimationFrame(updateProgress);
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [onComplete]);

  return (
    <div className="bg-background relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 select-none">
      {/* Dot Grid Background */}
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,_#000000_1px,_transparent_1px)] [background-size:24px_24px] opacity-40" />

      {/* Top Left Blob */}
      <div className="bg-primary/90 pointer-events-none absolute -top-[16vh] -left-[12vw] h-[clamp(260px,38vw,680px)] w-[clamp(260px,38vw,680px)] rounded-full" />

      {/* Bottom Right Blob */}
      <div className="bg-primary/90 pointer-events-none absolute -right-[12vw] -bottom-[16vh] h-[clamp(260px,38vw,680px)] w-[clamp(260px,38vw,680px)] rounded-full" />

      {/* Card */}
      <div className="border-border bg-cream relative z-10 flex w-[min(90vw,520px)] flex-col items-center justify-center rounded-md border px-8 py-10 shadow-xl backdrop-blur-sm">
        {/* Logo */}
        <img
          src="/format-hub.png"
          alt="Format Hub Logo"
          draggable="false"
          className="pointer-events-none mb-6 h-[clamp(110px,12vw,160px)] w-[clamp(110px,12vw,160px)] rounded-md object-contain shadow-lg"
        />

        {/* Title */}
        <h1 className="bg-primary font-heading animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_auto] bg-clip-text text-center text-[clamp(1.7rem,2.5vw,2.2rem)] font-extrabold tracking-tight text-transparent">
          Format Hub
        </h1>

        {/* Subtitle */}
        <p className="mt-2 max-w-sm text-center text-[clamp(0.9rem,1.3vw,1rem)] leading-relaxed text-slate-600">
          Convert any image, audio, or video format — instantly and offline.
          <br />
          Fast, private, and built for your desktop.
        </p>

        {/* Loading */}
        <div className="mt-8 w-full max-w-xs">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Loading...</span>
            <span>{Math.round(progress)}%</span>
          </div>

          <div className="bg-background h-2 w-full overflow-hidden rounded-full shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-black via-gray-700 to-black shadow-sm"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-sm text-gray-500">
        Developed By{" "}
        <a
          href="https://rafidstudio.cloud"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium"
        >
          Rafid Ahmed
        </a>
      </p>
    </div>
  );
}

export default SplashScreen;
