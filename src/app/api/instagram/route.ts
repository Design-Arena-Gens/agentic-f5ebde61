import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

interface InstagramRequestBody {
  imageData?: string;
  caption?: string;
  metadata?: Record<string, unknown>;
}

const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InstagramRequestBody;
    if (!body.imageData) {
      return NextResponse.json({ message: "Payload imageData wajib diisi." }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { message: "BLOB_READ_WRITE_TOKEN belum dikonfigurasi di environment Vercel." },
        { status: 500 },
      );
    }

    if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
      return NextResponse.json(
        { message: "IG_USER_ID atau IG_ACCESS_TOKEN belum tersedia untuk agen." },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(body.imageData, "base64");
    if (buffer.length === 0) {
      return NextResponse.json({ message: "Data gambar tidak valid." }, { status: 400 });
    }

    const blob = await put(`instagram-agent/${randomUUID()}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });

    const caption = body.caption?.trim() || "Karya generatif dari Human Art Instagram Agent.";
    const mediaPayload = new URLSearchParams({
      image_url: blob.url,
      caption,
      access_token: IG_ACCESS_TOKEN,
    });

    const creationResponse = await fetch(`https://graph.facebook.com/v19.0/${IG_USER_ID}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: mediaPayload,
    });

    const creationJson = await creationResponse.json();
    if (!creationResponse.ok || !creationJson.id) {
      const errorMessage = creationJson?.error?.message ?? "Gagal membuat kontainer media Instagram.";
      throw new Error(errorMessage);
    }

    const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: creationJson.id,
        access_token: IG_ACCESS_TOKEN,
      }),
    });

    const publishJson = await publishResponse.json();
    if (!publishResponse.ok || !publishJson.id) {
      const errorMessage = publishJson?.error?.message ?? "Gagal mempublikasikan media ke Instagram.";
      throw new Error(errorMessage);
    }

    return NextResponse.json(
      {
        mediaId: publishJson.id,
        blobUrl: blob.url,
        metadata: body.metadata ?? {},
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
