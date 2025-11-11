"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import {
  type AgentConfig,
  type ArtStyle,
  type Mood,
  type Pose,
  buildAgentConfig,
  describeAgentIntent,
  getBasePalette,
} from "@/lib/artAgent";
import { renderHumanArt } from "@/lib/drawHuman";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

const STYLE_PRESET: Array<{ value: ArtStyle; label: string; hint: string }> = [
  { value: "line", label: "Line Art", hint: "Garis ekspresif & minimalis" },
  { value: "watercolor", label: "Watercolor", hint: "Sapuan lembut penuh gradasi" },
  { value: "neon", label: "Neon", hint: "Kontras tinggi bernuansa futuristik" },
  { value: "charcoal", label: "Charcoal", hint: "Gelap dramatik dengan tekstur kasar" },
  { value: "pastel", label: "Pastel", hint: "Palet lembut bernuansa dreamy" },
];

const POSES: Array<{ value: Pose; label: string }> = [
  { value: "standing", label: "Berdiri Elegan" },
  { value: "sitting", label: "Duduk Santai" },
  { value: "dancing", label: "Menari Dinamis" },
  { value: "stretching", label: "Peregangan" },
  { value: "profile", label: "Profil Samping" },
];

const MOODS: Array<{ value: Mood; label: string }> = [
  { value: "confident", label: "Percaya Diri" },
  { value: "serene", label: "Tenang" },
  { value: "energetic", label: "Enerjik" },
  { value: "melancholic", label: "Melankolis" },
  { value: "mysterious", label: "Misterius" },
];

function useHumanArtAgent() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 10_000_000));
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(() =>
    buildAgentConfig("figur manusia kontemporer dengan cahaya neon dramatis"),
  );

  const regenerate = useCallback(() => {
    setSeed((prev) => (prev + 1) % 10_000_000);
  }, []);

  const updateConfig = useCallback((updates: Partial<AgentConfig>) => {
    setAgentConfig((prev) => {
      const next: AgentConfig = {
        ...prev,
        ...updates,
        palette:
          updates.palette ??
          (updates.style && updates.style !== prev.style ? getBasePalette(updates.style) : prev.palette),
      };
      return next;
    });
  }, []);

  const agentNotes = useMemo(() => describeAgentIntent(agentConfig), [agentConfig]);

  const syncPrompt = useCallback(
    (prompt: string) => {
      const next = buildAgentConfig(prompt, {
        ...agentConfig,
        prompt,
      });
      setAgentConfig(next);
      setSeed((prev) => (prev + 13) % 10_000_000);
    },
    [agentConfig],
  );

  return { agentConfig, updateConfig, agentNotes, seed, regenerate, syncPrompt };
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { agentConfig, updateConfig, agentNotes, seed, regenerate, syncPrompt } = useHumanArtAgent();
  const [caption, setCaption] = useState("Energi manusia urban dalam sorotan neon.");
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderHumanArt(ctx, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      seed,
      agent: agentConfig,
    });
  }, [agentConfig, seed]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `human-art-${agentConfig.style}-${seed}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [agentConfig.style, seed]);

  const handleUpload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setStatus("Kanvas tidak tersedia.");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    const [, base64] = dataUrl.split(",");
    setIsUploading(true);
    setStatus("Mengunggah ke Instagram melalui agen...");
    try {
      const response = await fetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: base64,
          caption,
          metadata: {
            style: agentConfig.style,
            pose: agentConfig.pose,
            mood: agentConfig.mood,
          },
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message ?? "Gagal mengunggah.");
      }
      const payload = await response.json();
      setStatus(`Berhasil dipublikasikan! Instagram media id: ${payload.mediaId}`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Gagal unggah: ${error.message}. Pastikan kredensial Instagram & Vercel Blob terset.`
          : "Gagal unggah karena kesalahan tak dikenal.",
      );
    } finally {
      setIsUploading(false);
    }
  }, [agentConfig.mood, agentConfig.pose, agentConfig.style, caption]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row">
        <section className="flex flex-1 flex-col gap-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Human Art Instagram Agent
            </h1>
            <p className="text-sm text-slate-300">
              Agen kreatif otonom yang merancang seni figur manusia dan siap mengunggah langsung ke Instagram
              menggunakan konfigurasi gaya yang Anda arahkan.
            </p>
          </header>

          <div className="overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl shadow-pink-500/10">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div>
                <h2 className="text-lg font-medium">Kanvas Agen</h2>
                <p className="text-xs text-slate-400">Resolusi Instagram potret 1080 × 1350</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={regenerate}
                  className="rounded-full border border-pink-500/60 bg-pink-500/20 px-4 py-2 text-sm font-medium text-pink-200 transition hover:bg-pink-500/30"
                >
                  Regenerasi Gesture
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium transition hover:border-slate-500 hover:bg-slate-700"
                >
                  Unduh PNG
                </button>
              </div>
            </div>
            <div className="flex justify-center bg-slate-900/60 p-6">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="h-[540px] w-auto max-w-full rounded-2xl border border-white/5 bg-slate-900/80 shadow-inner shadow-black/40"
              />
            </div>
          </div>

          <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-6">
            <h3 className="text-base font-semibold text-pink-200">Catatan Agen</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {agentNotes}
            </p>
          </article>

          {status ? (
            <div
              className={twMerge(
                "rounded-xl border px-4 py-3 text-sm transition",
                status.startsWith("Berhasil")
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  : "border-pink-500/40 bg-pink-500/10 text-pink-100",
              )}
            >
              {status}
            </div>
          ) : null}
        </section>

        <aside className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur lg:sticky lg:top-8">
          <div>
            <h2 className="text-lg font-semibold text-pink-200">Brief Visual</h2>
            <p className="mt-2 text-xs text-slate-400">
              Gunakan prompt untuk memandu agen memaknai gestur, suasana, dan warna.
            </p>
            <textarea
              className="mt-3 h-24 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-pink-400/70 focus:ring-2 focus:ring-pink-400/30"
              value={agentConfig.prompt}
              onChange={(event) => syncPrompt(event.target.value)}
              placeholder="Contoh: Penari urban dengan nuansa neon magenta dan cyan yang dinamis"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Gaya Visual</h3>
            <div className="grid grid-cols-1 gap-3">
              {STYLE_PRESET.map((item) => (
                <button
                  key={item.value}
                  onClick={() => updateConfig({ style: item.value, palette: getBasePalette(item.value) })}
                  className={twMerge(
                    "rounded-2xl border px-4 py-3 text-left transition",
                    agentConfig.style === item.value
                      ? "border-pink-500/60 bg-pink-500/15 text-pink-100"
                      : "border-white/10 bg-slate-950/40 text-slate-200 hover:border-pink-400/50 hover:bg-pink-500/10",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">agent</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Palet Agen</h3>
            <div className="flex flex-wrap gap-2">
              {agentConfig.palette.map((color, index) => (
                <label
                  key={`${color}-${index}`}
                  className="flex items-center gap-2 rounded-full border border-white/5 bg-slate-950/50 px-3 py-2 text-xs uppercase tracking-wide text-slate-300"
                >
                  <span className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => {
                      const nextPalette = [...agentConfig.palette];
                      nextPalette[index] = event.target.value;
                      updateConfig({ palette: nextPalette });
                    }}
                    className="h-6 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Pose</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/30"
                value={agentConfig.pose}
                onChange={(event) => updateConfig({ pose: event.target.value as Pose })}
              >
                {POSES.map((pose) => (
                  <option key={pose.value} value={pose.value}>
                    {pose.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Mood</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/30"
                value={agentConfig.mood}
                onChange={(event) => updateConfig({ mood: event.target.value as Mood })}
              >
                {MOODS.map((mood) => (
                  <option key={mood.value} value={mood.value}>
                    {mood.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-slate-300">
              Kompleksitas Gestur
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-1 text-[10px]">
                {agentConfig.complexity}
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={6}
              value={agentConfig.complexity}
              onChange={(event) => updateConfig({ complexity: Number(event.target.value) })}
              className="w-full accent-pink-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">Caption Instagram</label>
            <textarea
              className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Tulis caption yang ingin diposting oleh agen..."
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={twMerge(
              "w-full rounded-2xl border border-emerald-500/60 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30",
              isUploading && "cursor-not-allowed opacity-60",
            )}
          >
            {isUploading ? "Mengunggah..." : "Unggah ke Instagram"}
          </button>

          <div className="rounded-xl border border-white/5 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">Integrasi Instagram</p>
            <p className="mt-2">
              Atur environment variable <code>IG_USER_ID</code>, <code>IG_ACCESS_TOKEN</code>, dan{" "}
              <code>BLOB_READ_WRITE_TOKEN</code> di Vercel Project Settings agar agen dapat memublikasikan karya secara
              otomatis. Token Instagram harus berasal dari akun profesional yang memiliki izin konten.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
