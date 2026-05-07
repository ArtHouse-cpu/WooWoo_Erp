import AddItemModal from "../components/modals/AddItemModal";

type Props = {
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
};

export default function CreateProductModal({ onClose, onSubmit, loading }: Props) {
  return <AddItemModal onClose={onClose} onSubmit={onSubmit} loading={loading} />;
}
