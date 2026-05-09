import AddItemModal, { type AddItemFormValues } from "../components/modals/AddItemModal";

type Props = {
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  initialData?: Partial<AddItemFormValues>;
};

export default function CreateProductModal({ onClose, onSubmit, loading, initialData }: Props) {
  return <AddItemModal onClose={onClose} onSubmit={onSubmit} loading={loading} initialData={initialData} />;
}
