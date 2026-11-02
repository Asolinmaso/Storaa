import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import UploadedFile from "@/models/UploadedFile";
import Store from "@/models/Store";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!isValidObjectId(params.id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  await connectDB();
  const file = await UploadedFile.findById(params.id).lean();
  if (!file) return new NextResponse("Not found", { status: 404 });

  // Sensitive documents: flagged at upload, or (for older uploads) referenced as a store's ID / registration doc.
  const url = `/api/files/${params.id}`;
  const sensitive =
    file.private ||
    !!(await Store.exists({ $or: [{ bizRegDocUrl: url }, { ownerGovIdUrl: url }] }));

  if (sensitive) {
    const session = await getSession();
    const allowed =
      !!session &&
      (session.role === "admin" ||
        (file.uploadedBy && String(file.uploadedBy) === session.userId));
    if (!allowed) return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Cache-Control": sensitive
        ? "private, no-store"
        : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
