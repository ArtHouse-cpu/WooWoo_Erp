import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {ChevronLeft, ChevronRight, Image as ImageIcon} from 'lucide-react';

export type ImageCarouselProps = {
  images?: (string | null | undefined)[];
  alt?: string;
  aspectRatio?: string;
  className?: string;
  imageClassName?: string;
  roundedClassName?: string;
  badge?: ReactNode;
  showArrows?: boolean;
  showDots?: boolean;
  fallbackIcon?: ReactNode;
  fallbackText?: string;
  onImageClick?: (index: number) => void;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  enableMouseDrag?: boolean;
};

export function ImageCarousel({
  images: rawImages = [],
  alt = 'Image',
  aspectRatio = 'aspect-16/10',
  className = '',
  imageClassName = 'h-full w-full object-cover',
  roundedClassName = 'rounded-2xl',
  badge,
  showArrows = true,
  showDots = true,
  fallbackIcon,
  fallbackText,
  onImageClick,
  activeIndex: controlledIndex,
  onIndexChange,
  enableMouseDrag = true,
}: ImageCarouselProps) {
  // Normalize images list by filtering out falsy values
  const images = rawImages
    .map(url => String(url || '').trim())
    .filter((url): url is string => Boolean(url));

  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalIndex, setInternalIndex] = useState(0);
  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Sync scroll position if controlled activeIndex changes from outside
  useEffect(() => {
    if (controlledIndex === undefined) return;
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (width <= 0) return;
    const targetLeft = controlledIndex * width;
    if (Math.abs(el.scrollLeft - targetLeft) > 5) {
      el.scrollTo({left: targetLeft, behavior: 'smooth'});
    }
  }, [controlledIndex]);

  const updateIndex = useCallback(
    (index: number) => {
      setInternalIndex(index);
      onIndexChange?.(index);
    },
    [onIndexChange],
  );

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      const el = scrollRef.current;
      if (!el) return;
      const width = el.clientWidth;
      if (width <= 0) return;
      el.scrollTo({
        left: index * width,
        behavior: smooth ? 'smooth' : 'auto',
      });
      updateIndex(index);
    },
    [updateIndex],
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isDownRef.current) return;
    const width = el.clientWidth;
    if (width <= 0) return;
    const newIdx = Math.round(el.scrollLeft / width);
    if (newIdx >= 0 && newIdx < images.length && newIdx !== currentIndex) {
      updateIndex(newIdx);
    }
  }, [currentIndex, images.length, updateIndex]);

  const scrollPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    } else {
      // Loop to end
      scrollToIndex(images.length - 1);
    }
  };

  const scrollNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentIndex < images.length - 1) {
      scrollToIndex(currentIndex + 1);
    } else {
      // Loop to beginning
      scrollToIndex(0);
    }
  };

  // Mouse drag handlers for desktop trackpads/mice
  const onMouseDown = (e: React.MouseEvent) => {
    if (!enableMouseDrag || images.length <= 1) return;
    const el = scrollRef.current;
    if (!el) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDownRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const onMouseUp = () => {
    if (!isDownRef.current) return;
    isDownRef.current = false;
    // Snap to nearest slide
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (width > 0) {
      const nearestIdx = Math.round(el.scrollLeft / width);
      scrollToIndex(Math.max(0, Math.min(images.length - 1, nearestIdx)));
    }
  };

  const onMouseLeave = () => {
    if (isDownRef.current) {
      onMouseUp();
    }
  };

  // If no images, render fallback
  if (images.length === 0) {
    return (
      <div
        className={`relative ${aspectRatio} w-full overflow-hidden ${roundedClassName} bg-[#FFF9F3] flex flex-col items-center justify-center text-[#EA580C] shadow-xs ${className}`}
      >
        {fallbackIcon || <ImageIcon className="h-8 w-8 stroke-[1.5]" />}
        {fallbackText ? (
          <span className="mt-1 text-xs font-semibold text-slate-400">{fallbackText}</span>
        ) : null}
        {badge}
      </div>
    );
  }

  return (
    <div
      className={`group/carousel relative ${aspectRatio} w-full overflow-hidden ${roundedClassName} bg-[#FFF9F3] select-none shadow-xs ${className}`}
    >
      {/* Scrollable track with snap */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-none [touch-action:pan-y] cursor-grab active:cursor-grabbing"
        style={{scrollSnapType: 'x mandatory'}}
      >
        {images.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            onClick={e => {
              if (hasDraggedRef.current) {
                e.stopPropagation();
                return;
              }
              onImageClick?.(idx);
            }}
            className="relative h-full w-full shrink-0 snap-center overflow-hidden flex items-center justify-center"
          >
            <img
              src={src}
              alt={`${alt} ${idx + 1}`}
              loading={idx === 0 ? 'eager' : 'lazy'}
              className={`${imageClassName} pointer-events-none transition-transform duration-300`}
              onError={e => {
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>

      {/* Floating Badges */}
      {badge}

      {/* Arrows (shown when multiple images and showArrows is true) */}
      {images.length > 1 && showArrows && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/70 hover:scale-105 active:scale-95 cursor-pointer opacity-80 sm:opacity-0 sm:group-hover/carousel:opacity-100"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition hover:bg-black/70 hover:scale-105 active:scale-95 cursor-pointer opacity-80 sm:opacity-0 sm:group-hover/carousel:opacity-100"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Dots Indicator matching reference screenshot */}
      {images.length > 1 && showDots && (
        <div className="pointer-events-auto absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur-xs px-2.5 py-1">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={e => {
                e.stopPropagation();
                scrollToIndex(idx);
              }}
              className={`transition-all duration-200 cursor-pointer ${
                currentIndex === idx
                  ? 'h-2 w-3.5 rounded-full bg-white shadow-xs'
                  : 'h-1.5 w-1.5 rounded-full bg-white/60 hover:bg-white/90'
              }`}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
