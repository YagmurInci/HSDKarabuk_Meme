import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";
import type { ApiError } from "@/app/lib/types";

// ============================================
// /api/admin/memes - Meme CRUD
// Admin şifresi ile korunur (ADMIN_PASSWORD env var)
// ============================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function checkAdminAuth(request: NextRequest): boolean {
  if (!ADMIN_PASSWORD) return false; // ENV yoksa hiçbir erişime izin verme
  const authHeader = request.headers.get("x-admin-password");
  return authHeader === ADMIN_PASSWORD;
}

// GET - Tüm meme'leri listele (admin paneli için)
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Yetkisiz erişim.", code: "UNAUTHORIZED" } satisfies ApiError, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = checkRateLimit(ip, "admin", RATE_LIMITS.ADMIN);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit.", code: "RATE_LIMITED" } satisfies ApiError, { status: 429 });

  const memes = await prisma.meme.findMany({
    include: { correctOption: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(memes);
}

// POST - Yeni meme ekle (tek adımda: correctAnswer text → Option upsert → Meme create)
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Yetkisiz erişim.", code: "UNAUTHORIZED" } satisfies ApiError, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = checkRateLimit(ip, "admin", RATE_LIMITS.ADMIN);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit.", code: "RATE_LIMITED" } satisfies ApiError, { status: 429 });

  try {
    const body = await request.json();
    const { youtubeUrl, startTime, endTime, correctAnswer, correctOptionId } = body;

    if (!youtubeUrl || typeof startTime !== "number" || typeof endTime !== "number") {
      return NextResponse.json({ error: "Eksik alanlar: youtubeUrl, startTime, endTime gerekli.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
    }

    if (!correctAnswer && !correctOptionId) {
      return NextResponse.json({ error: "correctAnswer veya correctOptionId gerekli.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: "startTime, endTime'dan küçük olmalı.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
    }

    let optionId = correctOptionId;

    // correctAnswer text verilmişse → Option'ı bul veya oluştur
    if (correctAnswer && typeof correctAnswer === "string") {
      const trimmed = correctAnswer.trim();
      if (trimmed.length === 0) {
        return NextResponse.json({ error: "Doğru cevap boş olamaz.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
      }

      // Upsert: varsa bul, yoksa oluştur
      const option = await prisma.option.upsert({
        where: { text: trimmed },
        update: {}, // zaten varsa dokunma
        create: { text: trimmed },
      });
      optionId = option.id;
    }

    // correctOptionId doğrulama
    if (optionId && !correctAnswer) {
      const exists = await prisma.option.findUnique({ where: { id: optionId } });
      if (!exists) {
        return NextResponse.json({ error: "Geçersiz correctOptionId.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
      }
    }

    const meme = await prisma.meme.create({
      data: { youtubeUrl, startTime, endTime, correctOptionId: optionId },
      include: { correctOption: true },
    });

    return NextResponse.json(meme, { status: 201 });
  } catch (error) {
    console.error("[/api/admin/memes POST]", error);
    return NextResponse.json({ error: "Sunucu hatası.", code: "INTERNAL_ERROR" } satisfies ApiError, { status: 500 });
  }
}

// DELETE - Meme sil (query param: ?id=xxx)
export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Yetkisiz erişim.", code: "UNAUTHORIZED" } satisfies ApiError, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id parametresi gerekli.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
  }

  try {
    await prisma.meme.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Meme bulunamadı.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 404 });
  }
}
