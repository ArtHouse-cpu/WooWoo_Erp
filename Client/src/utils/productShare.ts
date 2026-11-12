import Swal from "sweetalert2";

const publicSite = () =>
  String(import.meta.env.VITE_PUBLIC_SITE_URL || "https://woowooarthouse.in").replace(/\/$/, "");

export const publicProductUrl = (productId: string) =>
  `${publicSite()}/supplies/product/${encodeURIComponent(productId)}`;

export async function sharePublicProduct(productId: string, name: string) {
  const url = publicProductUrl(productId);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: name || "Product",
        text: `${name || "Product"} at WooWoo Art House`,
        url,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }
  await navigator.clipboard.writeText(url);
  void Swal.fire({
    toast: true,
    position: "top",
    timer: 1600,
    showConfirmButton: false,
    icon: "success",
    title: "Product link copied",
  });
}
