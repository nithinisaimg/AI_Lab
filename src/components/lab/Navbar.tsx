import { useEffect, useState } from "react";

export function Navbar({ status }: { status: "idle" | "training" | "ready" }) {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const update = () => setTime(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const statusText = status === "training" ? "TRAINING" : status === "ready" ? "READY" : "STANDBY";

  return (
    <header className="sticky top-0 z-40 border-b border-panel-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="relative h-7 w-7 grid place-items-center border border-panel-border">
            <div className="h-2 w-2 bg-foreground" />
            <div className="absolute -top-1 -left-1 h-1.5 w-1.5 border-t border-l border-foreground/60" />
            <div className="absolute -bottom-1 -right-1 h-1.5 w-1.5 border-b border-r border-foreground/60" />
          </div>
          <div className="leading-tight">
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Creating Labs</div>
            <div className="font-mono text-sm tracking-widest text-glow">ML.CONSOLE_v1.0</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="text-foreground">/ lab</span>
          <span>/ datasets</span>
          <span>/ models</span>
          <span>/ docs</span>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block font-mono text-[11px] text-muted-foreground tabular-nums min-w-[180px]" suppressHydrationWarning>
            {time || "----.--.-- --:--:-- UTC"}
          </div>
          <div className="flex items-center gap-2 border border-panel-border px-2.5 py-1">
            <span className="relative inline-flex h-2 w-2">
              <span className={`absolute inset-0 rounded-full ${status === "training" ? "bg-foreground animate-pulse" : "bg-foreground"}`} />
              {status !== "idle" && <span className="absolute inset-0 rounded-full bg-foreground/50 animate-ping" />}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">AI · {statusText}</span>
          </div>
        </div>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
    </header>
  );
}
