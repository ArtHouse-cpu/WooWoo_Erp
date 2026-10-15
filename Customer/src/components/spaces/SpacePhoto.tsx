import {useState, type ReactNode} from 'react';
import {Building} from 'lucide-react';

export function SpacePhoto({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FFF7ED] text-[#EA580C]">
        {fallback || <Building className="h-8 w-8" />}
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setBroken(true)} />
  );
}
