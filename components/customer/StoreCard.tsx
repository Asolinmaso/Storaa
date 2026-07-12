"use client";

import Link from "next/link";
import type { StoreDTO } from "@/lib/types";

export default function StoreCard({ store }: { store: StoreDTO }) {
  return (
    <div className="store-card">
      <div className="store-card-img" style={{ background: store.color }}>
        <span className="store-card-emoji" aria-hidden="true">
          {store.emoji}
        </span>
        <span className="rating-chip">
          <span className="rating-star">★</span> {store.rating.toFixed(1)}
        </span>
      </div>
      <div className="store-card-body">
        <h3 className="store-card-name">{store.name}</h3>
        <p className="store-card-meta">
          {store.category} <span className="meta-sep">|</span>{" "}
          {store.distanceKm.toFixed(1)} km
        </p>
        <p className="store-card-hours">{store.hoursLabel}</p>
        <Link href={`/stores/${store._id}`} className="btn btn-primary btn-card">
          View Store
        </Link>
      </div>
    </div>
  );
}
