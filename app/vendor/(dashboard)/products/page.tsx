"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import type { ProductDTO } from "@/lib/types";

const emptyForm = {
  name: "",
  category: "",
  brand: "",
  price: "",
  unit: "",
  stock: "",
};

export default function VendorProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [specText, setSpecText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function loadProducts() {
    return fetch("/api/vendor/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []));
  }

  useEffect(() => {
    loadProducts()
      .catch(() => setError("Failed to load products. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setSpecText("");
    setImages([]);
    setEditingId(null);
    setFormError(null);
    setShowForm(false);
  }

  function startEdit(p: ProductDTO) {
    setForm({
      name: p.name,
      category: p.category,
      brand: p.brand ?? "",
      price: String(p.price),
      unit: p.unit,
      stock: String(p.stock ?? 0),
    });
    setSpecText((p.specifications ?? []).join("\n"));
    setImages(p.images ?? []);
    setEditingId(p._id);
    setShowForm(true);
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - images.length);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) urls.push(data.url);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 4));
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category.trim() || !(Number(form.price) > 0)) {
      setFormError("Name, category and price are required.");
      return;
    }
    setFormError(null);
    setSaving(true);
    const payload = {
      name: form.name,
      category: form.category,
      brand: form.brand,
      price: Number(form.price),
      unit: form.unit,
      stock: Number(form.stock) || 0,
      specifications: specText.split("\n").map((s) => s.trim()).filter(Boolean),
      images,
    };
    try {
      const res = editingId
        ? await fetch(`/api/vendor/products/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/vendor/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (res.ok) {
        await loadProducts();
        resetForm();
      } else {
        setFormError(data.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
      if (res.ok) await loadProducts();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="section-head">
        <h2 className="section-title">Products ({products.length})</h2>
        <Button
          small
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Product
        </Button>
      </div>

      {showForm && (
        <div className="dash-card">
          <div className="wizard-grid-2">
            <div className="form-field">
              <label htmlFor="vp-name">Name</label>
              <input
                id="vp-name"
                type="text"
                placeholder="Enter Product Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="vp-category">Category</label>
              <input
                id="vp-category"
                type="text"
                placeholder="Enter Product Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="vp-brand">Brand</label>
              <input
                id="vp-brand"
                type="text"
                placeholder="Enter Product Brand"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="vp-price">Price</label>
              <input
                id="vp-price"
                type="number"
                min="0"
                placeholder="Enter Product Price"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="vp-unit">Unit</label>
              <input
                id="vp-unit"
                type="text"
                placeholder="Enter Product Unit (Eg. kg, ml, g, piece, etc)"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="vp-stock">Stock</label>
              <input
                id="vp-stock"
                type="number"
                min="0"
                placeholder="Enter Stock"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field wizard-full">
            <label htmlFor="vp-specs">Specifications</label>
            <textarea
              id="vp-specs"
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
              {images.map((url) => (
                <span
                  key={url}
                  className="image-tile image-tile-preview"
                  style={{ backgroundImage: `url(${url})` }}
                />
              ))}
              {images.length < 4 && (
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
            <Button small loading={saving} onClick={handleSave}>
              {editingId ? "Update Product" : "Save Product"}
            </Button>
            <Button small variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <div className="form-banner form-banner-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="muted">No products yet. Add your first product.</p>
      ) : (
        <div className="vendor-product-list">
          {products.map((p) => (
            <div className="vendor-product-card" key={p._id}>
              <div className="vendor-product-media">
                <span
                  className="vendor-product-main-img"
                  style={p.images?.[0] ? { backgroundImage: `url(${p.images[0]})` } : undefined}
                />
                <div className="vendor-product-thumbs">
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="vendor-product-thumb"
                      style={
                        p.images?.[i] ? { backgroundImage: `url(${p.images[i]})` } : undefined
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="vendor-product-info">
                <div className="vendor-product-head">
                  <h3>{p.name}</h3>
                  <div className="vendor-product-actions">
                    <Button small variant="outline-purple" onClick={() => startEdit(p)}>
                      Edit
                    </Button>
                    <button
                      type="button"
                      className="btn-delete-outline"
                      disabled={deletingId === p._id}
                      onClick={() => handleDelete(p._id)}
                    >
                      {deletingId === p._id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
                <p>Category : {p.category}</p>
                <p>Brand : {p.brand || "—"}</p>
                <p>
                  Price / Unit : ₹{p.price} {p.unit && `/ ${p.unit}`}
                </p>
                <p>Availability : {(p.stock ?? 0) > 0 ? "In Stock" : "Out of Stock"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
