import {useState, type ReactNode} from 'react';
import {ShoppingBag} from 'lucide-react';

export function ProductPhoto({
  src,
  alt,
  fallback,
  className = 'h-full w-full object-cover',
}: {
  src: string | null;
  alt: string;
  fallback?: ReactNode;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FFF7ED] text-[#EA580C]">
        {fallback || <ShoppingBag className="h-8 w-8" />}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
