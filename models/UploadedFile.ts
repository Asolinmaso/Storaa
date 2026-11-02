import mongoose, { Schema, type Model, Types } from "mongoose";

export interface IUploadedFile {
  _id: Types.ObjectId;
  name: string;
  contentType: string;
  size: number;
  data: Buffer;
  uploadedBy: Types.ObjectId | null;
  /** Sensitive documents (IDs, registrations): only the uploader and admins can read them. */
  private: boolean;
}

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    name: { type: String, default: "" },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    private: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const UploadedFile: Model<IUploadedFile> =
  mongoose.models.UploadedFile ||
  mongoose.model<IUploadedFile>("UploadedFile", UploadedFileSchema);

export default UploadedFile;
