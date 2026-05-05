import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";
import type { ApiError } from "@/app/lib/types";

// ============================================
// /api/admin/memes - Meme CRUD
// Admin şifresi ile korunur (ADMIN_PASSWORD env var)
// ============================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function checkAdminAuth(request: NextRequest): boolean {
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

// POST - Yeni meme ekle
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Yetkisiz erişim.", code: "UNAUTHORIZED" } satisfies ApiError, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = checkRateLimit(ip, "admin", RATE_LIMITS.ADMIN);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit.", code: "RATE_LIMITED" } satisfies ApiError, { status: 429 });

  try {
    const body = await request.json();
    const { youtubeUrl, startTime, endTime, correctOptionId } = body;

    if (!youtubeUrl || typeof startTime !== "number" || typeof endTime !== "number" || !correctOptionId) {
      return NextResponse.json({ error: "Eksik alanlar: youtubeUrl, startTime, endTime, correctOptionId gerekli.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: "startTime, endTime'dan küçük olmalı.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
    }

    // correctOptionId'nin var olup olmadığını kontrol et
    const option = await prisma.option.findUnique({ where: { id: correctOptionId } });
    if (!option) {
      return NextResponse.json({ error: "Geçersiz correctOptionId.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
    }

    const meme = await prisma.meme.create({
      data: { youtubeUrl, startTime, endTime, correctOptionId },
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
