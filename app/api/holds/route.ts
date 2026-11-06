import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Hold from "@/models/Hold";
import Product from "@/models/Product";
import Store from "@/models/Store";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const holds = await Hold.find({ userId: session.userId }).sort({
    createdAt: -1,
  });
  return NextResponse.json({ holds });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { productId, quantity, visitDate, visitTime } = await req.json();
    const qty = Number(quantity) || 1;
    if (!productId || qty < 1 || !visitDate || !visitTime) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Product, quantity, visit date and time are required.",
        },
        { status: 400 }
      );
    }

    await connectDB();
    // Reserve stock atomically so two customers can't hold the last unit.
    const product = await Product.findOneAndUpdate(
      {
        _id: productId,
        stock: { $gte: qty },
        $or: [{ status: "approved" }, { status: { $exists: false } }],
      },
      { $inc: { stock: -qty } },
      { new: true }
    ).catch(() => null);
    if (!product) {
      const exists = await Product.exists({ _id: productId }).catch(() => null);
      if (exists) {
        return NextResponse.json(
          { code: "OUT_OF_STOCK", message: "Not enough stock available for this product." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Product not found." },
        { status: 404 }
      );
    }
    const store = await Store.findById(product.storeId);
    if (!store || store.status !== "approved") {
      await Product.updateOne({ _id: product._id }, { $inc: { stock: qty } });
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Store not found." },
        { status: 404 }
      );
    }
    if (store.isOpen === false) {
      await Product.updateOne({ _id: product._id }, { $inc: { stock: qty } });
      return NextResponse.json(
        { code: "STORE_PAUSED", message: "This store isn't taking holds right now. Please try again later." },
        { status: 409 }
      );
    }

    let hold;
    try {
      hold = await Hold.create({
      userId: session.userId,
      storeId: store._id,
      storeName: store.name,
      storeEmoji: store.emoji,
      storeColor: store.color,
      items: [
        {
          productId: product._id,
          name: product.name,
          emoji: product.emoji,
          price: product.price,
          quantity: qty,
        },
      ],
      total: product.price * qty,
      visitDate,
      visitTime,
      status: "active",
      });
    } catch (err) {
      await Product.updateOne({ _id: product._id }, { $inc: { stock: qty } });
      throw err;
    }

    // Tell the vendor (best effort; they also see it under Holds in their portal).
    if (store.email) {
      const buyer = await User.findById(session.userId).select("name email phone");
      void sendEmail(
        store.email,
        `New hold request: ${product.name} x ${qty}`,
        `${buyer?.name || buyer?.email || "A customer"} reserved ${qty} x ${product.name} (total Rs ${product.price * qty}) for ${visitDate} at ${visitTime}.${buyer?.phone ? ` Phone: ${buyer.phone}.` : ""} View it under Holds in your Storaa vendor portal.`
      ).catch((e) => console.error("Vendor hold email failed:", e));
    }

    return NextResponse.json({ hold }, { status: 201 });
  } catch (err) {
    console.error("Create hold error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
