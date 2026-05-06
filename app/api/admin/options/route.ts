import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/app/lib/rate-limit";
import type { ApiError } from "@/app/lib/types";

// ============================================
// /api/admin/options - Şık (Option) CRUD
// Admin şifresi ile korunur
// ============================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function checkAdminAuth(request: NextRequest): boolean {
  if (!ADMIN_PASSWORD) return false; // ENV yoksa hiçbir erişime izin verme
  const authHeader = request.headers.get("x-admin-password");
  return authHeader === ADMIN_PASSWORD;
}

// GET - Tüm şıkları listele
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Yetkisiz erişim.", code: "UNAUTHORIZED" } satisfies ApiError, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = checkRateLimit(ip, "admin", RATE_LIMITS.ADMIN);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit.", code: "RATE_LIMITED" } satisfies ApiError, { status: 429 });

  const options = await prisma.option.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { correctForMemes: true } },
    },
  });
  return NextResponse.json(options);
}

// POST - Yeni şık ekle (tek veya toplu)
export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Yetkisiz erişim.", code: "UNAUTHORIZED" } satisfies ApiError, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = checkRateLimit(ip, "admin", RATE_LIMITS.ADMIN);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit.", code: "RATE_LIMITED" } satisfies ApiError, { status: 429 });

  try {
    const body = await request.json();

    // Toplu ekleme desteği: { texts: ["A", "B", "C"] } veya tekli { text: "A" }
    if (body.texts && Array.isArray(body.texts)) {
      const options = await prisma.option.createMany({
        data: body.texts.map((text: string) => ({ text: text.trim() })),
        skipDuplicates: true,
      });
      return NextResponse.json({ created: options.count }, { status: 201 });
    }

    if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
      return NextResponse.json({ error: "text alanı gerekli.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
    }

    const option = await prisma.option.create({
      data: { text: body.text.trim() },
    });
    return NextResponse.json(option, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Bu şık zaten mevcut.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 409 });
    }
    console.error("[/api/admin/options POST]", error);
    return NextResponse.json({ error: "Sunucu hatası.", code: "INTERNAL_ERROR" } satisfies ApiError, { status: 500 });
  }
}

// DELETE - Şık sil (query param: ?id=xxx)
export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Yetkisiz erişim.", code: "UNAUTHORIZED" } satisfies ApiError, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id parametresi gerekli.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 400 });
  }

  // Bir meme'in doğru cevabı olan şık silinemez
  const usedInMemes = await prisma.meme.count({ where: { correctOptionId: id } });
  if (usedInMemes > 0) {
    return NextResponse.json(
      { error: `Bu şık ${usedInMemes} meme'de doğru cevap olarak kullanılıyor. Önce meme'leri güncelleyin.`, code: "VALIDATION_ERROR" } satisfies ApiError,
      { status: 409 }
    );
  }

  try {
    await prisma.option.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Şık bulunamadı.", code: "VALIDATION_ERROR" } satisfies ApiError, { status: 404 });
  }
}
