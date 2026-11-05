import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

const FALLBACK_SPACE_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80";

export type SpaceMediaSource = {
  name?: string;
  imageUrl?: string | null;
  images?: string[];
  videoUrl?: string | null;
  videos?: string[];
  image?: string | null;
};

type MediaItem = { kind: "image" | "video"; url: string };

const uniqueUrls = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const urls: string[] = [];
  values.forEach((value) => {
    const url = String(value || "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  });
  return urls;
};

export const spaceMediaItems = (space?: SpaceMediaSource | null): MediaItem[] => {
  if (!space) return [];
  const images = uniqueUrls([...(space.images || []), space.imageUrl, space.image]);
  const videos = uniqueUrls([...(space.videos || []), space.videoUrl]);
  return [
    ...images.map((url) => ({ kind: "image" as const, url })),
    ...videos.map((url) => ({ kind: "video" as const, url })),
  ];
};

type SpaceMediaCarouselProps = {
  space?: SpaceMediaSource | null;
  alt: string;
  className?: string;
};

export default function SpaceMediaCarousel({
  space,
  alt,
  className = "h-full w-full",
}: SpaceMediaCarouselProps) {
  const items = useMemo(() => spaceMediaItems(space), [space]);
  const slides = items.length
    ? items
    : [{ kind: "image" as const, url: FALLBACK_SPACE_IMAGE }];
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [space?.imageUrl, space?.videoUrl, items.length]);

  useEffect(() => {
    if (slides.length < 2 || viewerOpen) return;
    const delay = slides[index]?.kind === "video" ? 7000 : 2800;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [index, slides, viewerOpen]);

  const current = slides[index] || slides[0];

  const openViewer = (event: MouseEvent) => {
    event.stopPropagation();
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openViewer}
        className={`relative block overflow-hidden bg-slate-100 text-left ${className}`}
        aria-label={`Show photos and videos for ${alt}`}
      >
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${(index * 100) / slides.length}%)`,
          }}
        >
          {slides.map((item, slideIndex) => (
            <div
              key={`${item.kind}-${item.url}`}
              className="h-full"
              style={{ width: `${100 / slides.length}%` }}
            >
              {item.kind === "video" ? (
                <video
                  src={item.url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay={slideIndex === index}
                  loop
                  preload={slideIndex === index ? "auto" : "metadata"}
                />
              ) : (
                <img
                  src={item.url}
                  alt={alt}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_SPACE_IMAGE;
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {current.kind === "video" ? (
          <span className="pointer-events-none absolute left-2 bottom-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            <Play size={10} fill="currentColor" />
            Video
          </span>
        ) : null}

        {slides.length > 1 ? (
          <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {slides.map((item, dotIndex) => (
              <span
                key={`${item.url}-dot`}
                className={`h-1.5 rounded-full transition-all ${
                  dotIndex === index ? "w-3 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </span>
        ) : null}
      </button>

      {viewerOpen
        ? createPortal(
            <SpaceMediaViewer
              alt={alt}
              slides={slides}
              index={viewerIndex}
              onIndex={setViewerIndex}
              onClose={() => setViewerOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function SpaceMediaViewer({
  alt,
  slides,
  index,
  onIndex,
  onClose,
}: {
  alt: string;
  slides: MediaItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const item = slides[index] || slides[0];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndex((index + 1) % slides.length);
      if (event.key === "ArrowLeft") onIndex((index - 1 + slides.length) % slides.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose, onIndex, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const delay = item?.kind === "video" ? 8000 : 3200;
    const timer = window.setTimeout(() => {
      onIndex((index + 1) % slides.length);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [index, item?.kind, onIndex, slides.length]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <p className="truncate text-sm font-semibold">
            {alt}
            <span className="ml-2 text-xs font-medium text-white/70">
              {item.kind === "video" ? "Video" : "Photo"} {index + 1} / {slides.length}
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close media"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative flex h-[min(70vh,520px)] items-center justify-center bg-black">
          {item.kind === "video" ? (
            <video
              key={item.url}
              src={item.url}
              className="max-h-full max-w-full"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <img
              key={item.url}
              src={item.url}
              alt={alt}
              className="max-h-full max-w-full object-contain"
            />
          )}

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => onIndex((index - 1 + slides.length) % slides.length)}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800"
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => onIndex((index + 1) % slides.length)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800"
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
