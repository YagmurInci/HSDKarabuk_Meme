# 🎮 MEME GUESSER — Proje Mimarisi ve Sistem Promptu

> **Bu dosya projenin tek gerçek kaynağıdır (Single Source of Truth).**
> Tüm ekip üyeleri mimariyi, API kontratlarını ve kuralları buradan takip eder.
> Son güncelleme: 2026-05-05 | Baş Mimar: Şükrü

---

## 📋 Proje Özeti

YouTube meme kliplerinin oynatılıp kullanıcıdan hangi meme olduğunun tahmin edildiği, 10 soruluk bir quiz oyunu.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma ORM + Supabase PostgreSQL

---

## 🏗️ Klasör Yapısı ve Sorumluluk Haritası

```
memeguesser/
├── app/
│   ├── (game)/play/page.tsx          ← 🟢 YAĞMUR (Oyun Motoru)
│   ├── (auth)/login/page.tsx         ← 🔵 CEMRE (Login/Landing)
│   ├── (admin)/backoffice/page.tsx   ← 🟠 CEYDA (Admin Panel)
│   ├── components/
│   │   ├── leaderboard.tsx           ← 🟣 NESLİHAN (Liderlik Tablosu)
│   │   └── ui/                       ← 🔴 MELİH (UI/UX Stilleri)
│   ├── api/
│   │   ├── game/start/route.ts       ← ⚫ ŞÜKRÜ (Anti-Cheat)
│   │   ├── game/submit/route.ts      ← ⚫ ŞÜKRÜ (Anti-Cheat)
│   │   ├── leaderboard/route.ts      ← ⚫ ŞÜKRÜ (API)
│   │   └── admin/                    ← ⚫ ŞÜKRÜ (CRUD API)
│   └── lib/
│       ├── prisma.ts                 ← ⚫ DOKUNMAYIN
│       ├── anti-cheat.ts             ← ⚫ DOKUNMAYIN
│       ├── rate-limit.ts             ← ⚫ DOKUNMAYIN
│       └── types.ts                  ← ⚫ DOKUNMAYIN (tipleri import edin)
├── prisma/schema.prisma              ← ⚫ ŞÜKRÜ
├── docs/
│   ├── PROJECT_PLAN.md               ← Bu dosya
│   └── prompts/                      ← Kişisel görev dosyaları
│       ├── YAGMUR_GAME_ENGINE.md
│       ├── CEMRE_AUTH_LOGIN.md
│       ├── NESLIHAN_LEADERBOARD.md
│       ├── CEYDA_ADMIN.md
│       ├── MELIH_UI_UX.md
│       └── SUKRU_ARCHITECT.md
└── .env.example
```

---

## 🔌 API Kontratları (Tüm Ekip İçin)

### `POST /api/game/start`
Yeni oyun oturumu başlatır. **Client doğru cevabı GÖREMEZ.**

**Response:**
```json
{
  "sessionToken": "abc123...",
  "memes": [
    {
      "id": "cuid1",
      "youtubeUrl": "https://youtube.com/watch?v=xxx",
      "startTime": 15,
      "endTime": 25,
      "options": [
        { "id": "opt1", "text": "Rickroll" },
        { "id": "opt2", "text": "Dank Meme" },
        { "id": "opt3", "text": "Nyan Cat" },
        { "id": "opt4", "text": "Keyboard Cat" }
      ]
    }
  ]
}
```

### `POST /api/game/submit`
Oyun sonucunu gönderir. **Skor SERVER tarafında hesaplanır.**

**Request:**
```json
{
  "sessionToken": "abc123...",
  "username": "Oyuncu1",
  "answers": [
    { "memeId": "cuid1", "selectedOptionId": "opt2" }
  ],
  "timeTakenMs": 45000
}
```

**Response:**
```json
{
  "score": 8775,
  "correctCount": 9,
  "totalQuestions": 10,
  "rank": 3
}
```

### `GET /api/leaderboard?limit=20`
En yüksek skorları döner.

**Response:**
```json
[
  { "rank": 1, "username": "Pro", "score": 9500, "correctCount": 10, "totalTime": 30000, "createdAt": "..." }
]
```

### Admin API'leri (`/api/admin/*`)
`x-admin-password` header'ı gerektirir.

---

## 🛡️ Anti-Cheat Sistemi

```
1. Client → POST /api/game/start → Server HMAC token + rastgele 10 meme döner
2. Client oyunu oynar, her şık seçiminde memeId + selectedOptionId kaydeder
3. Client → POST /api/game/submit → { sessionToken, answers[], timeTakenMs, username }
4. Server: HMAC doğrula → süre kontrolü → tekrar kullanım kontrolü → cevapları DB'den doğrula → skor hesapla → leaderboard'a kaydet
```

**Kural:** Client ASLA `{ score: 9999 }` gibi direkt skor göndermez. Sadece cevaplarını gönderir.

---

## 📐 Skor Formülü

```
skor = max(0, (doğru_sayısı × 1000) - (toplam_süre_saniye × 5))
```

Örnek: 8 doğru, 45 saniye → max(0, 8000 - 225) = **7775 puan**

---

## 🌿 Git Branch Stratejisi

```
main ← Production (Vercel auto-deploy)
├── feature/game-engine     ← Yağmur
├── feature/login           ← Cemre
├── feature/leaderboard     ← Neslihan
├── feature/admin           ← Ceyda
└── feature/ui-styling      ← Melih
```

**Kural:** Herkes SADECE kendi klasöründe çalışır. `app/lib/` ve `prisma/` dosyalarına dokunmak yasaktır.

---

## 🚀 Hızlı Başlangıç (Tüm Ekip İçin)

```bash
# 1. Repo'yu klonla
git clone https://github.com/mlhgks0868/HSDKarabuk_Meme.git
cd HSDKarabuk_Meme

# 2. Bağımlılıkları yükle
npm install

# 3. ENV dosyasını kopyala (Şükrü'den .env.local bilgilerini al)
cp .env.example .env.local

# 4. Kendi branch'ini oluştur
git checkout -b feature/SENIN-BRANCH-ADIN

# 5. Dev server'ı başlat
npm run dev
```
