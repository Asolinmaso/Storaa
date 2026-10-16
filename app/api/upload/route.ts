import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import UploadedFile from "@/models/UploadedFile";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};
const ALLOWED_TYPES = new Set(Object.values(TYPE_BY_EXT));

// Some mobile browsers send an empty or generic MIME type, so fall back to the extension.
function resolveType(file: File): string {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXT[ext] ?? file.type;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Your session expired. Please log in again." },
        { status: 401 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "No file was provided." },
        { status: 400 }
      );
    }

    const contentType = resolveType(file);
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Only JPG, PNG, WEBP, GIF or PDF files are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "File must be under 8MB." },
        { status: 400 }
      );
    }

    // Stored in MongoDB rather than on disk so uploads work on read-only/serverless hosts
    // and are served immediately (Next doesn't serve files added to /public after build).
    await connectDB();
    const saved = await UploadedFile.create({
      name: file.name,
      contentType,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
      uploadedBy: session.userId,
    });

    return NextResponse.json({ url: `/api/files/${saved._id}`, name: file.name });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
