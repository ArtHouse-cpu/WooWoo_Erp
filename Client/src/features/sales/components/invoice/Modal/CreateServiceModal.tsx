import AddItemModal, {
  type AddItemFormValues,
} from "../components/modals/AddItemModal";

type Props = {
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  loading: boolean;
  initialData?: Partial<AddItemFormValues>;
  mode?: "create" | "edit";
};

/** Service-only create/edit modal (no product/service toggle). */
export default function CreateServiceModal({
  onClose,
  onSubmit,
  loading,
  initialData,
  mode = "create",
}: Props) {
  return (
    <AddItemModal
      lockType="service"
      mode={mode}
      onClose={onClose}
      onSubmit={onSubmit}
      loading={loading}
      initialData={{
        type: "service",
        ...initialData,
        serviceName:
          initialData?.serviceName ||
          initialData?.productName ||
          "",
      }}
    />
  );
}
