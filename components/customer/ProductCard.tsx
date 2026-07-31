"use client";

import Link from "next/link";
import type { ProductDTO, StoreDTO } from "@/lib/types";

export function ProductListingCard({ product }: { product: ProductDTO }) {
  const store =
    typeof product.storeId === "object" ? (product.storeId as StoreDTO) : null;
  return (
    <Link href={`/products/${product._id}`} className="product-card">
      <div
        className="product-card-img"
        style={
          product.images && product.images.length > 0
            ? {
                backgroundImage: `url(${product.images[0]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        {!(product.images && product.images.length > 0) && (
          <span className="product-card-emoji" aria-hidden="true">
            {product.emoji}
          </span>
        )}
        <span className="price-chip">₹{product.price}</span>
      </div>
      <div className="product-card-body">
        <h3 className="product-card-name">{product.name}</h3>
        {store && (
          <>
            <p className="store-card-meta">
              {store.name} <span className="meta-sep">|</span>{" "}
              {store.distanceKm.toFixed(1)} km
            </p>
            <p className="store-card-hours">{store.hoursLabel}</p>
          </>
        )}
      </div>
    </Link>
  );
}

export function StoreProductCard({
  product,
  onHold,
}: {
  product: ProductDTO;
  onHold: (product: ProductDTO) => void;
}) {
  return (
    <div className="product-card">
      <div
        className="product-card-img"
        style={
          product.images && product.images.length > 0
            ? {
                backgroundImage: `url(${product.images[0]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        {!(product.images && product.images.length > 0) && (
          <span className="product-card-emoji" aria-hidden="true">
            {product.emoji}
          </span>
        )}
        <span className="rating-chip">
          <span className="rating-star">★</span> {product.rating.toFixed(1)}
        </span>
      </div>
      <div className="product-card-body">
        <h3 className="product-card-name">{product.name}</h3>
        <p className="product-card-price">
          ₹{product.price} <span className="meta-sep">/</span> {product.unit}
        </p>
        <div className="product-card-actions">
          <Link
            href={`/products/${product._id}`}
            className="btn btn-outline-purple btn-card-half"
          >
            View
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-card-half"
            onClick={() => onHold(product)}
          >
            Hold
          </button>
        </div>
      </div>
    </div>
  );
}
