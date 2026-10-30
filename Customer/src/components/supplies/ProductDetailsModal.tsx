import {useEffect, useState} from 'react';
import {closeIfConfirmed} from '../../utils/confirmClose';
import {X} from 'lucide-react';
import type {CustomerProduct} from '../../services/product.service';
import {formatInr} from './productActions';
import {ProductEnquiry} from './ProductEnquiry';
import {ProductPhoto} from './ProductPhoto';

type ProductDetailsModalProps = {
  product: CustomerProduct | null;
  onClose: () => void;
};

export function ProductDetailsModal({product, onClose}: ProductDetailsModalProps) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    setActiveImage(product?.imageUrl || product?.images[0] || null);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void closeIfConfirmed(onClose);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  if (!product) return null;
  const gallery = product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const inStock = product.availability !== 'out_of_stock';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) void closeIfConfirmed(onClose);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#EA580C]">
            {product.category || 'Supplies'}
          </p>
          <button
            type="button"
            onClick={() => void closeIfConfirmed(onClose)}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close product details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="bg-[#FFF7ED]">
            <div className="aspect-square w-full">
              <ProductPhoto src={activeImage} alt={product.name} />
            </div>
            {gallery.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-3">
                {gallery.map(url => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(url)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border ${
                      activeImage === url ? 'border-[#EA580C]' : 'border-transparent'
                    }`}
                  >
                    <ProductPhoto src={url} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 p-4 text-left sm:p-5">
            <div>
              <h2 id="product-details-title" className="font-display text-2xl font-bold text-[#111111]">
                {product.name}
              </h2>
              {product.brandName ? (
                <p className="mt-1 text-sm font-semibold text-slate-500">{product.brandName}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-extrabold text-[#111111]">₹{formatInr(product.price)}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                  inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {inStock ? 'In stock' : 'Out of stock'}
              </span>
              {product.unit ? (
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-extrabold text-[#9A3412]">
                  {product.unit}
                </span>
              ) : null}
            </div>
            {product.discountValue > 0 ? (
              <p className="text-sm font-bold text-[#EA580C]">
                Offer: {product.discountType === 'percentage'
                  ? `${product.discountValue}% off`
                  : `₹${formatInr(product.discountValue)} off`}
              </p>
            ) : null}
            {product.subCategory ? (
              <p className="text-sm font-semibold text-slate-500">{product.subCategory}</p>
            ) : null}
            <p className="text-sm leading-6 text-slate-600">
              {product.description || 'Details for this supply will be shared when you enquire.'}
            </p>
            <div className="mt-auto pt-2">
              <ProductEnquiry product={product} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
