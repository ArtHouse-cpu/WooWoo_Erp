import {useState} from 'react';
import {Loader2, MessageCircle, Share2} from 'lucide-react';
import {toast} from 'sonner';
import type {CustomerProduct} from '../../services/product.service';
import {copyProductLink, productQueryUrl} from './productActions';
import {ShareProductModal} from './ShareProductModal';

type ProductEnquiryProps = {
  product: CustomerProduct;
};

export function ProductEnquiry({product}: ProductEnquiryProps) {
  const [sharing, setSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleQuery = () => {
    const url = productQueryUrl(product);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowShareModal(true);
      return;
    }
    setSharing(true);
    try {
      await copyProductLink(product._id);
      toast.success('Product link copied to clipboard');
    } catch {
      toast.error('Could not copy the product link.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={sharing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-extrabold text-[#6344E7] transition hover:bg-purple-50 active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Share
        </button>
        <button
          type="button"
          onClick={handleQuery}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#6344E7] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#5235D9] active:scale-95 cursor-pointer"
        >
          <MessageCircle className="h-4 w-4" />
          Query
        </button>
      </div>

      <ShareProductModal
        product={product}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
