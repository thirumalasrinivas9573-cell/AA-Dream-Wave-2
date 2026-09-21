"use client";

import {
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  Subtitles,
} from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { LEARN_SUBTITLE_TRACKS } from "@/constants/learn";
import { cn } from "@/lib/utils";
import type { LearnAnimation, LearnChapter } from "@/types/learn";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildVtt(chapters: LearnChapter[]) {
  const cues = chapters.flatMap((chapter) =>
    chapter.captionCues.map(
      (cue, index) =>
        `${chapter.id}-${index}\n${toVttTime(cue.start)} --> ${toVttTime(cue.end)}\n${cue.text}\n`,
    ),
  );
  return `WEBVTT\n\n${cues.join("\n")}`;
}

function toVttTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const whole = Math.floor(s);
  const ms = Math.round((s - whole) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${whole
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

type VideoPlayerProps = {
  animation: LearnAnimation;
  initialPosition?: number;
  seekToSec?: number | null;
  onSeekHandled?: () => void;
  onProgress?: (positionSec: number, percent: number, chapterId?: string) => void;
  onChapterChange?: (chapter: LearnChapter) => void;
  onEnded?: () => void;
  className?: string;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function LearnVideoPlayer({
  animation,
  initialPosition = 0,
  seekToSec = null,
  onSeekHandled,
  onProgress,
  onChapterChange,
  onEnded,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(initialPosition);
  const [syncedInitialPosition, setSyncedInitialPosition] =
    useState(initialPosition);
  if (initialPosition !== syncedInitialPosition) {
    setSyncedInitialPosition(initialPosition);
    setCurrent(initialPosition);
  }
  const [duration, setDuration] = useState(animation.durationSec);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [subtitleId, setSubtitleId] = useState<string>(
    LEARN_SUBTITLE_TRACKS[0]?.id ?? "en",
  );
  const [resolution, setResolution] = useState(
    animation.resolutions[0]?.label || "Auto",
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [src, setSrc] = useState(
    animation.resolutions[0]?.src || animation.videoSrc,
  );

  const vttUrl = useMemo(() => {
    const blob = new Blob([buildVtt(animation.chapters)], {
      type: "text/vtt",
    });
    return URL.createObjectURL(blob);
  }, [animation.chapters]);

  useEffect(() => {
    return () => URL.revokeObjectURL(vttUrl);
  }, [vttUrl]);

  const activeChapter = useMemo(() => {
    const list = animation.chapters;
    let found = list[0];
    for (const chapter of list) {
      if (current >= chapter.startSec) found = chapter;
    }
    return found;
  }, [animation.chapters, current]);

  useEffect(() => {
    if (activeChapter) onChapterChange?.(activeChapter);
  }, [activeChapter, onChapterChange]);

  const emitProgress = useCallback(
    (time: number, dur: number) => {
      const percent = dur > 0 ? Math.min(100, Math.round((time / dur) * 100)) : 0;
      onProgress?.(time, percent, activeChapter?.id);
    },
    [activeChapter?.id, onProgress],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (initialPosition > 0) {
      video.currentTime = initialPosition;
    }
  }, [initialPosition]);

  useEffect(() => {
    if (seekToSec === null || seekToSec === undefined) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seekToSec;
    setCurrent(seekToSec);
    emitProgress(seekToSec, duration || video.duration || 1);
    onSeekHandled?.();
  }, [duration, emitProgress, onSeekHandled, seekToSec]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      if (track) track.mode = captionsOn ? "showing" : "hidden";
    }
  }, [captionsOn, src, subtitleId]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrent(value);
    emitProgress(value, duration || video.duration || 1);
  };

  const jumpChapter = (chapter: LearnChapter) => {
    seek(chapter.startSec);
  };

  const changeSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length] ?? 1;
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  const changeResolution = (label: string) => {
    const option = animation.resolutions.find((item) => item.label === label);
    if (!option || !videoRef.current) return;
    const time = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;
    setResolution(label);
    setSrc(option.src);
    requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = time;
      video.playbackRate = speed;
      if (wasPlaying) void video.play();
    });
  };

  const toggleFullscreen = async () => {
    const shell = shellRef.current;
    if (!shell) return;
    if (!document.fullscreenElement) {
      await shell.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "k") {
      event.preventDefault();
      void togglePlay();
    } else if (event.key === "f") {
      event.preventDefault();
      void toggleFullscreen();
    } else if (event.key === "c") {
      event.preventDefault();
      setCaptionsOn((v) => !v);
    } else if (event.key === "ArrowRight") {
      seek(Math.min(duration, current + 5));
    } else if (event.key === "ArrowLeft") {
      seek(Math.max(0, current - 5));
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  return (
    <div
      ref={shellRef}
      className={cn(
        "border-border bg-card group relative overflow-hidden rounded-2xl border",
        className,
      )}
      tabIndex={0}
      role="region"
      aria-label={`${animation.title} video player`}
      onKeyDown={onKeyDown}
    >
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black object-contain"
        src={src}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onClick={() => void togglePlay()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || animation.durationSec);
        }}
        onTimeUpdate={(event) => {
          const time = event.currentTarget.currentTime;
          const dur = event.currentTarget.duration || duration;
          setCurrent(time);
          emitProgress(time, dur);
        }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      >
        <track
          kind="captions"
          srcLang={
            LEARN_SUBTITLE_TRACKS.find((item) => item.id === subtitleId)?.lang ??
            "en"
          }
          label={
            LEARN_SUBTITLE_TRACKS.find((item) => item.id === subtitleId)?.label ??
            "English"
          }
          src={vttUrl}
          default={captionsOn}
        />
      </video>

      <div className="from-black/70 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-3 md:p-4">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(current, duration || 1)}
          onChange={(event) => seek(Number(event.target.value))}
          className="accent-primary mb-3 w-full"
          aria-label="Seek"
        />

        <div className="flex flex-wrap items-center gap-2 text-white">
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            onClick={() => void togglePlay()}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
          </Button>

          <span
            className="text-xs tabular-nums"
            aria-label={`${formatTime(current)} of ${formatTime(duration)}`}
          >
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={changeSpeed}
            aria-label={`Playback speed ${speed}x`}
          >
            {speed}x
          </Button>

          <Button
            type="button"
            size="icon-sm"
            variant={captionsOn ? "default" : "secondary"}
            onClick={() => setCaptionsOn((v) => !v)}
            aria-pressed={captionsOn}
            aria-label="Toggle captions"
          >
            <Subtitles className="size-4" aria-hidden="true" />
          </Button>

          <label className="sr-only" htmlFor="subtitle-track">
            Subtitle language
          </label>
          <select
            id="subtitle-track"
            className="bg-secondary text-secondary-foreground h-7 rounded-lg px-2 text-xs"
            value={subtitleId}
            disabled={!captionsOn}
            onChange={(event) => setSubtitleId(event.target.value)}
          >
            {LEARN_SUBTITLE_TRACKS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="resolution">
            Resolution
          </label>
          <select
            id="resolution"
            className="bg-secondary text-secondary-foreground h-7 rounded-lg px-2 text-xs"
            value={resolution}
            onChange={(event) => changeResolution(event.target.value)}
          >
            {animation.resolutions.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            onClick={() => void togglePiP()}
            aria-label="Picture in picture"
          >
            <PictureInPicture2 className="size-4" aria-hidden="true" />
          </Button>

          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="size-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-4" aria-hidden="true" />
            )}
          </Button>

          <span className="text-white/80 ml-auto hidden text-xs sm:inline">
            {activeChapter?.title}
          </span>
        </div>

        <div className="mt-3 hidden gap-1 overflow-x-auto md:flex">
          {animation.chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => jumpChapter(chapter)}
              className={cn(
                "focus-visible:ring-ring rounded-lg px-2 py-1 text-left text-[11px] whitespace-nowrap transition outline-none focus-visible:ring-2",
                activeChapter?.id === chapter.id
                  ? "bg-white text-black"
                  : "bg-white/15 hover:bg-white/25 text-white",
              )}
              aria-current={activeChapter?.id === chapter.id ? "true" : undefined}
            >
              {chapter.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
