import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.line1?.trim()) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Address Line 1 is required." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    user.addresses.push({
      label: body.label?.trim() || "Home",
      name: body.name?.trim() ?? "",
      phone: body.phone?.trim() ?? "",
      line1: body.line1.trim(),
      line2: body.line2?.trim() ?? "",
      city: body.city?.trim() ?? "",
      state: body.state?.trim() ?? "",
      postalCode: body.postalCode?.trim() ?? "",
      country: body.country?.trim() ?? "",
      isDefault: user.addresses.length === 0,
    });
    await user.save();

    return NextResponse.json({ addresses: user.addresses }, { status: 201 });
  } catch (err) {
    console.error("Add address error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const addressId = searchParams.get("id");
  if (!addressId) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Address id is required." },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findById(session.userId);
  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  user.addresses = user.addresses.filter(
    (a) => a._id?.toString() !== addressId
  );
  await user.save();
  return NextResponse.json({ addresses: user.addresses });
}
