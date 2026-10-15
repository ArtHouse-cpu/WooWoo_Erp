import {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import axios from 'axios';
import {ProductEnquiry} from '../../components/supplies/ProductEnquiry';
import {ProductPhoto} from '../../components/supplies/ProductPhoto';
import {formatInr, productShareUrl, setProductPageMeta} from '../../components/supplies/productActions';
import {fetchCustomerProduct, type CustomerProduct} from '../../services/product.service';

export default function PublicProductPage() {
  const {id = ''} = useParams();
  const [product, setProduct] = useState<CustomerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMissing(false);
    setError('');
    setProduct(null);
    fetchCustomerProduct(id, controller.signal)
      .then(result => {
        setProduct(result);
        setActiveImage(result.imageUrl || result.images[0] || null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setMissing(true);
          return;
        }
        setError('Could not load this product.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    return setProductPageMeta({
      title: `${product.name} · WooWoo Supplies`,
      description: product.description || `${product.name} from WooWoo Art House supplies.`,
      image: product.imageUrl,
      url: productShareUrl(product._id),
    });
  }, [product]);

  return (
    <div className="min-h-dvh bg-[#FAFBFD]">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="font-display text-lg font-bold text-[#111111]">WooWoo Supplies</p>
          <Link to="/login" className="text-sm font-extrabold text-[#EA580C]">
            Customer login
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-slate-100" />
            <div className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
              <div className="h-24 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ) : missing ? (
          <Unavailable message="This product is unavailable." />
        ) : error ? (
          <Unavailable message={error} />
        ) : product ? (
          <article className="grid gap-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm md:grid-cols-2">
            <div className="bg-[#FFF7ED]">
              <div className="aspect-square">
                <ProductPhoto src={activeImage} alt={product.name} />
              </div>
              {product.images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {product.images.map(url => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveImage(url)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                        activeImage === url ? 'border-[#EA580C]' : 'border-transparent'
                      }`}
                    >
                      <ProductPhoto src={url} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-4 p-5 text-left sm:p-6">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#EA580C]">
                {product.category || 'Supplies'}
              </p>
              <h1 className="font-display text-3xl font-bold text-[#111111]">{product.name}</h1>
              {product.brandName ? (
                <p className="font-semibold text-slate-500">{product.brandName}</p>
              ) : null}
              <p className="text-2xl font-extrabold">₹{formatInr(product.price)}</p>
              <p className="text-sm font-bold text-slate-500">
                {product.availability === 'out_of_stock' ? 'Out of stock' : 'In stock'}
                {product.unit ? ` · ${product.unit}` : ''}
              </p>
              <p className="text-sm leading-6 text-slate-600">
                {product.description || 'Ask us about this product and we will share the details.'}
              </p>
              <ProductEnquiry product={product} />
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}

function Unavailable({message}: {message: string}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center">
      <h1 className="font-display text-2xl font-bold text-[#111111]">Product unavailable</h1>
      <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
      <Link
        to="/login"
        className="mt-5 inline-flex rounded-xl bg-[#EA580C] px-4 py-2 text-sm font-extrabold text-white"
      >
        Go to WooWoo
      </Link>
    </div>
  );
}
