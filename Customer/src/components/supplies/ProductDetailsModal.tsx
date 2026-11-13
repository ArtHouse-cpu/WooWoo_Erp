import {useEffect, useState} from 'react';
import {X, Package} from 'lucide-react';
import type {CustomerProduct} from '../../services/product.service';
import {formatInr} from './productActions';
import {ProductEnquiry} from './ProductEnquiry';
import {ProductPhoto} from './ProductPhoto';
import {ImageCarousel} from '../ui/ImageCarousel';

type ProductDetailsModalProps = {
  product: CustomerProduct | null;
  onClose: () => void;
};

function getOriginalPrice(product: CustomerProduct): number {
  if (!product.discountValue || product.discountValue <= 0) return 0;
  if (product.discountType === 'percentage') {
    if (product.discountValue >= 100) return 0;
    return Math.round(product.price / (1 - product.discountValue / 100));
  }
  return product.price + product.discountValue;
}

export function ProductDetailsModal({product, onClose}: ProductDetailsModalProps) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    setActiveImage(product?.imageUrl || product?.images[0] || null);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  if (!product) return null;
  const gallery = product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const inStock = product.availability !== 'out_of_stock';
  const originalPrice = getOriginalPrice(product);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-xs font-semibold text-[#7C3AED]">
              <Package size={13} className="shrink-0 text-[#7C3AED]" />
              <span>{product.category || 'Supplies'}</span>
            </span>
            {product.subCategory && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {product.subCategory}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close product details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Image Section */}
          <div className="bg-[#FFF9F3] p-4 flex flex-col justify-center">
            <ImageCarousel
              images={gallery}
              alt={product.name}
              aspectRatio="aspect-square"
              roundedClassName="rounded-2xl"
              activeIndex={Math.max(0, gallery.indexOf(activeImage || ''))}
              onIndexChange={newIdx => {
                if (gallery[newIdx]) setActiveImage(gallery[newIdx]);
              }}
              showDots={gallery.length > 1}
              showArrows={gallery.length > 1}
            />
            {gallery.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pt-3">
                {gallery.map(url => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(url)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition cursor-pointer ${
                      activeImage === url ? 'border-[#6344E7]' : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    <ProductPhoto src={url} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Details Section */}
          <div className="flex flex-col gap-3 p-4 text-left sm:p-6">
            <div>
              <h2 id="product-details-title" className="font-display text-xl sm:text-2xl font-bold text-[#111111]">
                {product.name}
              </h2>
              {product.brandName ? (
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">{product.brandName}</p>
              ) : null}
            </div>

            {/* Price & Stock status */}
            <div className="flex flex-wrap items-baseline gap-2 pt-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ₹{formatInr(product.price)}
              </span>
              {originalPrice > product.price && (
                <span className="text-sm sm:text-base font-semibold text-slate-400 line-through">
                  ₹{formatInr(originalPrice)}
                </span>
              )}
              {inStock ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/60 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  In Stock
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200/60 ml-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Out of Stock
                </span>
              )}
              {product.unit ? (
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-[#6344E7]">
                  {product.unit}
                </span>
              ) : null}
            </div>

            {/* Offer details */}
            {product.discountValue > 0 ? (
              <p className="text-xs sm:text-sm font-bold text-emerald-600">
                Offer: {product.discountType === 'percentage'
                  ? `${product.discountValue}% off`
                  : `₹${formatInr(product.discountValue)} off`}
              </p>
            ) : null}

            {/* Category tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3E8FF] px-2.5 py-1 text-xs font-semibold text-[#7C3AED]">
                <Package size={13} className="shrink-0 text-[#7C3AED]" />
                <span>{product.category || 'Craft Supplies'}</span>
              </span>
              {product.subCategory ? (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {product.subCategory}
                </span>
              ) : null}
            </div>

            {/* Description */}
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</p>
              <p className="text-sm leading-6 text-slate-600 whitespace-pre-line">
                {product.description || 'Details for this supply will be shared when you enquire.'}
              </p>
            </div>

            {/* Query & Share Buttons */}
            <div className="mt-auto pt-3 border-t border-slate-100">
              <ProductEnquiry product={product} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
