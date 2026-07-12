import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";
import Product from "@/models/Product";
import { getSession } from "@/lib/auth";

interface SubmitProduct {
  name: string;
  category: string;
  brand?: string;
  price: number;
  unit?: string;
  stock?: number;
  specifications?: string[];
  images?: string[];
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId });
  if (!store) {
    return NextResponse.json({ store: null });
  }

  const products = await Product.find({ storeId: store._id }).sort({
    createdAt: -1,
  });

  return NextResponse.json({ store, products });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const { storeDetails, vendorDetails, products } = body as {
      storeDetails: Record<string, string>;
      vendorDetails: Record<string, string>;
      products: SubmitProduct[];
    };

    const requiredStoreFields = [
      "name",
      "category",
      "storeTime",
      "weeklyOff",
      "address",
      "city",
      "state",
      "postalCode",
      "storePhotoUrl",
      "bizRegDocUrl",
      "description",
    ];
    const requiredVendorFields = [
      "ownerName",
      "ownerContact",
      "ownerEmail",
      "ownerGovIdUrl",
      "accountHolderName",
      "bankName",
      "bankAccountNumber",
      "bankIfsc",
      "panNumber",
    ];

    for (const f of requiredStoreFields) {
      if (!storeDetails?.[f]?.toString().trim()) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: `Store details: "${f}" is required.` },
          { status: 400 }
        );
      }
    }
    for (const f of requiredVendorFields) {
      if (!vendorDetails?.[f]?.toString().trim()) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: `Vendor & bank details: "${f}" is required.` },
          { status: 400 }
        );
      }
    }
    if (!Array.isArray(products) || products.length < 5) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Please add at least 5 products." },
        { status: 400 }
      );
    }
    for (const p of products) {
      if (!p.name?.trim() || !p.category?.trim() || !(Number(p.price) > 0)) {
        return NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Every product needs a name, category and price.",
          },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const existing = await Store.findOne({ ownerId: session.userId });
    if (existing && existing.status !== "rejected") {
      return NextResponse.json(
        {
          code: "ALREADY_SUBMITTED",
          message: "Your store application has already been submitted.",
        },
        { status: 409 }
      );
    }

    const storeData = {
      name: storeDetails.name.trim(),
      category: storeDetails.category.trim(),
      address: `${storeDetails.address.trim()}, ${storeDetails.city.trim()}, ${storeDetails.state.trim()}, ${storeDetails.postalCode.trim()}`,
      shortAddress: `${storeDetails.address.trim()}, ${storeDetails.city.trim()} - ${storeDetails.postalCode.trim()}`,
      city: storeDetails.city.trim(),
      state: storeDetails.state.trim(),
      postalCode: storeDetails.postalCode.trim(),
      storeTime: storeDetails.storeTime.trim(),
      weeklyOff: storeDetails.weeklyOff.trim(),
      hoursLabel: storeDetails.storeTime.trim(),
      storePhotoUrl: storeDetails.storePhotoUrl,
      bizRegDocUrl: storeDetails.bizRegDocUrl,
      bizRegDocName: storeDetails.bizRegDocName ?? "",
      description: storeDetails.description.trim(),
      owner: vendorDetails.ownerName.trim(),
      ownerContact: vendorDetails.ownerContact.trim(),
      phone: vendorDetails.ownerContact.trim(),
      email: vendorDetails.ownerEmail.trim(),
      ownerGovIdUrl: vendorDetails.ownerGovIdUrl,
      ownerGovIdName: vendorDetails.ownerGovIdName ?? "",
      accountHolderName: vendorDetails.accountHolderName.trim(),
      bankName: vendorDetails.bankName.trim(),
      bankAccountNumber: vendorDetails.bankAccountNumber.trim(),
      bankIfsc: vendorDetails.bankIfsc.trim(),
      gstNumber: vendorDetails.gstNumber?.trim() ?? "",
      panNumber: vendorDetails.panNumber.trim(),
      ownerId: session.userId,
      status: "under_review" as const,
      rejectionReason: "",
      isOpen: true,
      featured: false,
      rating: 0,
      reviewCount: 0,
    };

    let store;
    if (existing) {
      Object.assign(existing, storeData);
      store = await existing.save();
      await Product.deleteMany({ storeId: store._id });
    } else {
      store = await Store.create(storeData);
    }

    await Product.insertMany(
      products.map((p) => ({
        storeId: store._id,
        name: p.name.trim(),
        category: p.category.trim(),
        brand: p.brand?.trim() ?? "",
        price: Number(p.price),
        unit: p.unit?.trim() ?? "",
        stock: Number(p.stock) || 0,
        specifications: p.specifications ?? [],
        images: p.images ?? [],
        rating: 0,
        reviewCount: 0,
      }))
    );

    return NextResponse.json({ store }, { status: 201 });
  } catch (err) {
    console.error("Vendor store submit error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
