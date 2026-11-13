import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { cancelHold, isHoldError } from "@/lib/holds";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { action } = await req.json();
  if (action !== "cancel") {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Unsupported action." },
      { status: 400 }
    );
  }

  await connectDB();
  const result = await cancelHold({ _id: params.id, userId: session.userId });
  if (isHoldError(result)) {
    return NextResponse.json(
      result.code === "NOT_ACTIVE" ? { code: "NOT_FOUND", message: "Active hold not found." } : { code: result.code, message: result.message },
      { status: result.code === "NOT_ACTIVE" ? 404 : result.status }
    );
  }
  const hold = result;
  return NextResponse.json({ hold });
}
