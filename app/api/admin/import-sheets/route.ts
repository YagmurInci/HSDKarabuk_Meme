import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import type { ApiError } from "@/app/lib/types";

// ============================================
// POST /api/admin/import-sheets
// Google Sheets CSV'den toplu meme aktarımı
// Sheets formatı: "Meme Adı", "Görsel URL", "YouTube URL"
// ============================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Google Sheets public CSV export URL'i
const SHEETS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1-ymQS0OOQLF5FWFQfFRiBoKRkJ7N1WjkiqEoIr27ifU/gviz/tq?tqx=out:csv&gid=0";

function checkAdminAuth(request: NextRequest): boolean {
  if (!ADMIN_PASSWORD) return false;
  const authHeader = request.headers.get("x-admin-password");
  return authHeader === ADMIN_PASSWORD;
}

// Basit CSV parser (Google Sheets formatı için)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// YouTube URL'den video ID çıkar (veya zaten saf ID ise doğrudan döner)
function extractVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Zaten saf video ID ise (11 karakter, alfanumerik + _ -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = trimmed.match(p);
    if (match) return match[1];
  }
  return null;
}

// YouTube URL'den startTime çıkar (?t=3s veya &t=10s)
function extractStartTime(url: string): number {
  const match = url.match(/[?&]t=(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// Shorts mu?
function isShorts(url: string): boolean {
  return url.includes("/shorts/");
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  details: { name: string; status: "imported" | "skipped" | "error"; reason?: string }[];
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json(
      { error: "Yetkisiz erişim.", code: "UNAUTHORIZED" } satisfies ApiError,
      { status: 401 }
    );
  }

  try {
    // 1. Google Sheets CSV'yi çek
    const csvResponse = await fetch(SHEETS_CSV_URL, {
      headers: { "Accept": "text/csv" },
    });

    if (!csvResponse.ok) {
      return NextResponse.json(
        { error: "Google Sheets'e erişilemedi.", code: "SHEETS_ERROR" } satisfies ApiError,
        { status: 502 }
      );
    }

    const csvText = await csvResponse.text();
    const lines = csvText.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "Sheets boş veya header-only.", code: "VALIDATION_ERROR" } satisfies ApiError,
        { status: 400 }
      );
    }

    // 2. Header'ı atla, satırları parse et
    const dataLines = lines.slice(1); // İlk satır header
    const result: ImportResult = { imported: 0, skipped: 0, errors: [], details: [] };

    // 3. Mevcut meme'lerin YouTube URL'lerini al (duplikat engeli)
    const existingMemes = await prisma.meme.findMany({
      select: { youtubeUrl: true },
    });
    const existingVideoIds = new Set(
      existingMemes.map((m) => extractVideoId(m.youtubeUrl)).filter(Boolean)
    );

    // 4. Her satır için meme oluştur
    for (const line of dataLines) {
      const cols = parseCSVLine(line);
      const memeName = cols[0]?.trim();
      const imageUrl = cols[1]?.trim() || null;
      const youtubeUrl = cols[2]?.trim();

      // Validasyon
      if (!memeName) {
        result.errors.push(`Boş meme adı atlandı`);
        result.skipped++;
        continue;
      }

      if (!youtubeUrl) {
        result.details.push({ name: memeName, status: "error", reason: "YouTube URL yok" });
        result.errors.push(`${memeName}: YouTube URL yok`);
        result.skipped++;
        continue;
      }

      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        result.details.push({ name: memeName, status: "error", reason: "Geçersiz YouTube URL" });
        result.errors.push(`${memeName}: Geçersiz YouTube URL (${youtubeUrl})`);
        result.skipped++;
        continue;
      }

      // Duplikat kontrolü
      if (existingVideoIds.has(videoId)) {
        result.details.push({ name: memeName, status: "skipped", reason: "Zaten mevcut" });
        result.skipped++;
        continue;
      }

      // start/end time hesapla
      const startTime = extractStartTime(youtubeUrl);
      const endTime = isShorts(youtubeUrl) ? 60 : startTime + 30; // Shorts: full video, Normal: 30sn

      try {
        // Option upsert (doğru cevap)
        const option = await prisma.option.upsert({
          where: { text: memeName },
          update: {},
          create: { text: memeName },
        });

        // Meme oluştur
        await prisma.meme.create({
          data: {
            youtubeUrl: videoId, // Sadece video ID sakla
            imageUrl: imageUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            startTime,
            endTime,
            correctOptionId: option.id,
          },
        });

        existingVideoIds.add(videoId); // Aynı batch içinde duplikat engeli
        result.imported++;
        result.details.push({ name: memeName, status: "imported" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
        result.errors.push(`${memeName}: ${msg}`);
        result.details.push({ name: memeName, status: "error", reason: msg });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${result.imported} meme aktarıldı, ${result.skipped} atlandı.`,
      ...result,
    });
  } catch (error) {
    console.error("[/api/admin/import-sheets POST]", error);
    return NextResponse.json(
      { error: "Sunucu hatası.", code: "INTERNAL_ERROR" } satisfies ApiError,
      { status: 500 }
    );
  }
}
