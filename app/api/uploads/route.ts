import { v2 as cloudinary } from "cloudinary";
import { currentUserId } from "../../../lib/access";

const MAX_BYTES = 8 * 1024 * 1024;
const allowedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return Response.json({ error: "Der Bildspeicher ist noch nicht konfiguriert." }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind") === "attachment" ? "attachment" : "image";
  if (!(file instanceof File)) return Response.json({ error: "Bitte wähle eine Datei aus." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Die Datei darf höchstens 8 MB groß sein." }, { status: 413 });
  if (kind === "image" && !allowedImages.has(file.type)) return Response.json({ error: "Unterstützt werden JPG, PNG, WebP und GIF." }, { status: 415 });

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: `nexa-notes/${userId}`,
    resource_type: kind === "image" ? "image" : "raw",
    use_filename: true,
    unique_filename: true,
  });
  return Response.json({ url: result.secure_url, publicId: result.public_id, bytes: result.bytes, mimeType: file.type });
}
