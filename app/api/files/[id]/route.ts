import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import UploadedFile from "@/models/UploadedFile";

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

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
