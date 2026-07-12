"use client";

import { useRef, useState } from "react";
import Button from "@/components/Button";
import {
  emptyDraftProduct,
  MIN_PRODUCTS,
  type DraftProduct,
} from "@/lib/vendorOnboarding";

interface Props {
  products: DraftProduct[];
  onChange: (products: DraftProduct[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function makeTempId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProductsStep({ products, onChange, onNext, onBack }: Props) {
  const [draft, setDraft] = useState<Omit<DraftProduct, "tempId">>(emptyDraftProduct);
  const [specText, setSpecText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof typeof draft>(key: K, v: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [key]: v }));
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - draft.images.length);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (res.ok) urls.push(data.url);
      }
      setDraft((d) => ({ ...d, images: [...d.images, ...urls].slice(0, 4) }));
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function resetDraft() {
    setDraft(emptyDraftProduct);
    setSpecText("");
    setEditingId(null);
    setFormError(null);
  }

  function handleAddOrUpdate() {
    if (!draft.name.trim() || !draft.category.trim() || !(Number(draft.price) > 0)) {
      setFormError("Name, category and price are required.");
      return;
    }
    setFormError(null);
    const specifications = specText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingId) {
      onChange(
        products.map((p) =>
          p.tempId === editingId ? { ...draft, specifications, tempId: editingId } : p
        )
      );
    } else {
      onChange([...products, { ...draft, specifications, tempId: makeTempId() }]);
    }
    resetDraft();
  }

  function handleEdit(p: DraftProduct) {
    setDraft({
      name: p.name,
      category: p.category,
      brand: p.brand,
      price: p.price,
      unit: p.unit,
      stock: p.stock,
      specifications: p.specifications,
      images: p.images,
    });
    setSpecText(p.specifications.join("\n"));
    setEditingId(p.tempId);
    setFormError(null);
  }

  function handleDelete(tempId: string) {
    onChange(products.filter((p) => p.tempId !== tempId));
  }

  function handleNext() {
    if (products.length < MIN_PRODUCTS) {
      setListError(`Please add at least ${MIN_PRODUCTS} products before continuing.`);
      return;
    }
    setListError(null);
    onNext();
  }

  return (
    <div>
      <h2 className="section-title">Add Products</h2>
      <p className="wizard-hint">
        Add at least {MIN_PRODUCTS} products. Your store and products will be reviewed
        together. Once approved, you can add more products anytime.
      </p>

      <div className="wizard-grid-2">
        <div className="form-field">
          <label htmlFor="pd-name">Name</label>
          <input
            id="pd-name"
            type="text"
            placeholder="Enter Product Name"
            value={draft.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pd-category">Category</label>
          <input
            id="pd-category"
            type="text"
            placeholder="Enter Product Category"
            value={draft.category}
            onChange={(e) => setField("category", e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pd-brand">Brand</label>
          <input
            id="pd-brand"
            type="text"
            placeholder="Enter Product Brand"
            value={draft.brand}
            onChange={(e) => setField("brand", e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pd-price">Price</label>
          <input
            id="pd-price"
            type="number"
            min="0"
            placeholder="Enter Product Price"
            value={draft.price}
            onChange={(e) => setField("price", e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pd-unit">Unit</label>
          <input
            id="pd-unit"
            type="text"
            placeholder="Enter Product Unit (Eg. kg, ml, g, piece, etc)"
            value={draft.unit}
            onChange={(e) => setField("unit", e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pd-stock">Stock</label>
          <input
            id="pd-stock"
            type="number"
            min="0"
            placeholder="Enter Stock"
            value={draft.stock}
            onChange={(e) => setField("stock", e.target.value)}
          />
        </div>
      </div>

      <div className="form-field wizard-full">
        <label htmlFor="pd-specs">Specifications</label>
        <textarea
          id="pd-specs"
          className="wizard-textarea"
          placeholder="Enter Other product details in the format of points..."
          value={specText}
          onChange={(e) => setSpecText(e.target.value)}
        />
      </div>

      <div className="wizard-full">
        <label className="wizard-upload-label">Upload Product Images</label>
        <p className="wizard-hint-sm">Upload up to 4 clear images only. First image will be main image.</p>
        <div className="image-tile-row">
          {draft.images.map((url) => (
            <span
              key={url}
              className="image-tile image-tile-preview"
              style={{ backgroundImage: `url(${url})` }}
            />
          ))}
          {draft.images.length < 4 && (
            <button
              type="button"
              className="image-tile image-tile-add"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
            >
              <span>+</span>
              {uploading ? "Uploading…" : "Add Image"}
            </button>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={handleImagePick}
        />
      </div>

      {formError && <div className="form-banner form-banner-error">{formError}</div>}

      <div className="wizard-actions wizard-actions-start">
        <Button small variant="outline-purple" onClick={handleAddOrUpdate}>
          {editingId ? "Update Product" : "+ Add Product"}
        </Button>
        {editingId && (
          <Button small variant="outline" onClick={resetDraft}>
            Cancel Edit
          </Button>
        )}
      </div>

      <hr className="divider" />

      <h2 className="section-title">Products ({products.length})</h2>
      {listError && <div className="form-banner form-banner-error">{listError}</div>}
      {products.length === 0 ? (
        <p className="muted">No products added yet.</p>
      ) : (
        <div className="vendor-product-list">
          {products.map((p) => (
            <div className="vendor-product-card" key={p.tempId}>
              <div className="vendor-product-media">
                <span
                  className="vendor-product-main-img"
                  style={p.images[0] ? { backgroundImage: `url(${p.images[0]})` } : undefined}
                />
                <div className="vendor-product-thumbs">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="vendor-product-thumb"
                      style={p.images[i] ? { backgroundImage: `url(${p.images[i]})` } : undefined}
                    />
                  ))}
                </div>
              </div>
              <div className="vendor-product-info">
                <div className="vendor-product-head">
                  <h3>{p.name}</h3>
                  <div className="vendor-product-actions">
                    <Button small variant="outline-purple" onClick={() => handleEdit(p)}>
                      Edit
                    </Button>
                    <button
                      type="button"
                      className="btn-delete-outline"
                      onClick={() => handleDelete(p.tempId)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p>Category : {p.category}</p>
                <p>Brand : {p.brand || "—"}</p>
                <p>
                  Price / Unit : {p.price ? `₹${p.price}` : "—"} {p.unit && `/ ${p.unit}`}
                </p>
                <p>Availability : {Number(p.stock) > 0 ? "In Stock" : "Out of Stock"}</p>
                {p.specifications.length > 0 && (
                  <div>
                    <p>Specifications :</p>
                    {p.specifications.map((s, i) => (
                      <p key={i}>{s}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="wizard-actions wizard-actions-split">
        <Button variant="outline-purple" small onClick={onBack}>
          Back
        </Button>
        <Button small onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
