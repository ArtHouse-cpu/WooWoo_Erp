import { useState } from "react";
import {
  ListPlus,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import type { EventItem, CustomFormField } from "../../types/eventTypes";
import { generateId } from "../../utils/eventHelpers";

interface Step3CheckoutFormProps {
  event: EventItem;
  onChange: (updates: Partial<EventItem>) => void;
}

export const Step3CheckoutForm = ({ event, onChange }: Step3CheckoutFormProps) => {
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<CustomFormField["type"]>("text");
  const [newPlaceholder, setNewPlaceholder] = useState("");
  const [newOptions, setNewOptions] = useState("Option 1, Option 2, Option 3");
  const [newRequired, setNewRequired] = useState(false);

  const fields = event.checkoutFields || [];

  const handleToggleFieldEnabled = (fieldId: string) => {
    const updated = fields.map((f) =>
      f.id === fieldId ? { ...f, enabled: !f.enabled } : f
    );
    onChange({ checkoutFields: updated });
  };

  const handleToggleFieldRequired = (fieldId: string) => {
    const updated = fields.map((f) =>
      f.id === fieldId ? { ...f, required: !f.required } : f
    );
    onChange({ checkoutFields: updated });
  };

  const handleUpdateFieldLabel = (fieldId: string, label: string) => {
    const updated = fields.map((f) =>
      f.id === fieldId ? { ...f, label } : f
    );
    onChange({ checkoutFields: updated });
  };

  const handleMoveOrder = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const updatedWithOrder = reordered.map((f, i) => ({ ...f, order: i + 1 }));
    onChange({ checkoutFields: updatedWithOrder });
  };

  const handleRemoveField = (fieldId: string) => {
    const updated = fields.filter((f) => f.id !== fieldId);
    onChange({ checkoutFields: updated });
  };

  const handleCreateCustomField = () => {
    if (!newLabel.trim()) return;

    const newField: CustomFormField = {
      id: generateId(),
      name: newLabel.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      label: newLabel.trim(),
      type: newType,
      placeholder: newPlaceholder,
      required: newRequired,
      enabled: true,
      order: fields.length + 1,
      options:
        newType === "dropdown" || newType === "radio"
          ? newOptions.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
    };

    onChange({ checkoutFields: [...fields, newField] });
    setNewLabel("");
    setNewPlaceholder("");
    setShowAddFieldModal(false);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Configuration Builder (7 cols) */}
      <div className="space-y-6 lg:col-span-7">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Checkout & Attendee Form Fields
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Customize attendee details collected at registration time.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddFieldModal(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
            >
              <Plus size={13} /> + Add Custom Field
            </button>
          </div>

          {/* New Custom Field Modal / Card */}
          {showAddFieldModal && (
            <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4 text-xs dark:border-slate-700 dark:bg-slate-800">
              <h4 className="font-bold text-orange-800 dark:text-orange-300">
                Create New Checkout Field
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Field Label
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Dietary Restrictions or T-Shirt Size"
                    className="mt-1 w-full rounded border border-gray-200 p-2 dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Input Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as CustomFormField["type"])}
                    className="mt-1 w-full rounded border border-gray-200 p-2 dark:bg-slate-700"
                  >
                    <option value="text">Single-line Text</option>
                    <option value="number">Number</option>
                    <option value="dropdown">Dropdown Select</option>
                    <option value="radio">Radio Choice</option>
                    <option value="checkbox">Single Checkbox</option>
                    <option value="file">File Upload / ID Document</option>
                  </select>
                </div>

                {(newType === "dropdown" || newType === "radio") && (
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Options (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newOptions}
                      onChange={(e) => setNewOptions(e.target.value)}
                      placeholder="e.g. Vegetarian, Non-Vegetarian, Vegan, Gluten-Free"
                      className="mt-1 w-full rounded border border-gray-200 p-2 dark:bg-slate-700"
                    />
                  </div>
                )}

                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Placeholder Text
                  </label>
                  <input
                    type="text"
                    value={newPlaceholder}
                    onChange={(e) => setNewPlaceholder(e.target.value)}
                    placeholder="Hint inside input"
                    className="mt-1 w-full rounded border border-gray-200 p-2 dark:bg-slate-700"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <label className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRequired}
                      onChange={(e) => setNewRequired(e.target.checked)}
                    />
                    Mandatory Field
                  </label>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateCustomField}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 font-bold text-white hover:bg-orange-700"
                >
                  Add Field
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddFieldModal(false)}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Form Fields List */}
          <div className="mt-4 space-y-2">
            {fields.map((field, idx) => {
              const isDefault = ["fullName", "email", "phone"].includes(field.name);

              return (
                <div
                  key={field.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs transition ${
                    field.enabled
                      ? "border-gray-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-800/80"
                      : "border-gray-200 bg-gray-50 opacity-60 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(idx, "up")}
                        className="text-gray-400 hover:text-black disabled:opacity-30"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === fields.length - 1}
                        onClick={() => handleMoveOrder(idx, "down")}
                        className="text-gray-400 hover:text-black disabled:opacity-30"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateFieldLabel(field.id, e.target.value)}
                        className="font-bold text-gray-900 dark:text-white border-b border-transparent hover:border-gray-300 focus:border-orange-500 bg-transparent px-1"
                      />
                      <span className="block text-[10px] text-gray-400 font-mono">
                        Type: {field.type} {field.options ? `(${field.options.length} options)` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Required toggle */}
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={isDefault}
                        onChange={() => handleToggleFieldRequired(field.id)}
                      />
                      <span className="text-[11px] text-gray-600 dark:text-gray-300">
                        Required
                      </span>
                    </label>

                    {/* Enable toggle */}
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.enabled}
                        disabled={isDefault}
                        onChange={() => handleToggleFieldEnabled(field.id)}
                      />
                      <span className="text-[11px] text-gray-600 dark:text-gray-300">
                        Active
                      </span>
                    </label>

                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Delete Field"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Live Interactive Checkout Preview (5 cols) */}
      <div className="lg:col-span-5">
        <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
              <Eye size={15} className="text-orange-600" /> Live Form Preview
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              Updates in real-time
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {fields
              .filter((f) => f.enabled)
              .sort((a, b) => a.order - b.order)
              .map((field) => (
                <div key={field.id} className="text-xs">
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    {field.label}{" "}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.type === "dropdown" ? (
                    <select className="mt-1 w-full rounded-md border border-gray-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                      <option value="">{field.placeholder || "Select an option"}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "radio" ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-1 text-xs">
                          <input type="radio" name={field.name} />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === "checkbox" ? (
                    <label className="mt-1 flex items-center gap-1.5">
                      <input type="checkbox" />
                      <span>{field.placeholder || "Yes, I agree"}</span>
                    </label>
                  ) : field.type === "file" ? (
                    <div className="mt-1 rounded-md border border-dashed border-gray-300 p-2 text-center text-[11px] text-gray-400">
                      Click to upload file
                    </div>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={field.placeholder}
                      className="mt-1 w-full rounded-md border border-gray-200 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  )}
                </div>
              ))}
          </div>

          <button
            type="button"
            className="mt-5 w-full rounded-lg bg-orange-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
          >
            Review & Pay
          </button>
        </div>
      </div>
    </div>
  );
};
