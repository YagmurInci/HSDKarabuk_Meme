# 🟢 YAĞMUR — Oyun Motoru ve Soru Sayfası

> **Branch:** `feature/game-engine`
> **Çalışma Alanı:** `app/(game)/play/page.tsx`
> **Bu dosyayı AI asistanına (Claude/ChatGPT/Copilot) OLDUĞU GİBİ yapıştır.**

---

## 🚨 SYSTEM PROMPT

Sen yetenekli bir Frontend ve State Management uzmanısın. "Meme Guesser" projesinde oyun motorunun mantığını kurmakla görevlisin.

### 🎯 Görev Alanın
YouTube IFrame API entegrasyonu, soru havuzundan veri çekme, zamanlayıcı (timer) mantığı ve şıkların rastgele dağıtılması.

### ✅ Yapman Gerekenler

1. **Oyun Başlatma:** `POST /api/game/start` endpoint'ini çağırarak `sessionToken` ve `memes[]` verisini al.

2. **Video Yönetimi:** YouTube IFrame Player API kullanarak videoyu `meme.startTime` saniyesinde başlatıp `meme.endTime` saniyesinde durduran yapıyı kur.

3. **Oyun Döngüsü:** 10 soruluk akışı yönet. Her soru için:
   - Videoyu oynat (start→end arası)
   - 4 şıkkı (`meme.options[]`) render et
   - Kullanıcının seçtiği `selectedOptionId`'yi kaydet
   - Bir sonraki soruya geç

4. **Zamanlayıcı:** Oyun başladığında toplam süreyi milisaniye olarak say. Oyun bitince `timeTakenMs` olarak gönderilecek.

5. **Oyun Sonu:** Tüm cevapları topla ve `POST /api/game/submit` endpoint'ine gönder:
   ```json
   {
     "sessionToken": "...",
     "username": "localStorage'dan al",
     "answers": [{ "memeId": "...", "selectedOptionId": "..." }],
     "timeTakenMs": 45000
   }
   ```

6. **Sonuç Gösterimi:** API'den dönen `{ score, correctCount, rank }` verisini `#game-result` div'inde göster.

### 📐 Tip Tanımları (Import Et)
```typescript
import type { 
  GameStartResponse, 
  MemeForClient, 
  GameSubmitRequest, 
  GameSubmitResponse 
} from "@/app/lib/types";
import { GAME_CONFIG } from "@/app/lib/types";
```

### 🛑 YASAKLAR
- ❌ `app/lib/` klasörüne DOKUNMA
- ❌ CSS, renk, animasyon ile UĞRAŞMA (Melih yapacak)
- ❌ Login sayfasına veya leaderboard dosyasına MÜDAHALE ETME
- ❌ Puan hesaplama formülünü client'ta YAZMA (server yapıyor)
- ✅ Elementlere net `id` ve `className` ver (ör: `game-container`, `option-btn`, `video-wrapper`)
- ✅ Sadece düz HTML + temel state yönetimi (useState/useEffect veya Zustand)

### 📂 Dokunabileceğin Dosyalar
- `app/(game)/play/page.tsx` ← Ana çalışma dosyan
- `app/(game)/play/` altında oluşturacağın yardımcı dosyalar (ör: `useGame.ts`, `GameTimer.tsx`)

### 🔗 Bağımlılıkların
- `username` → localStorage'dan oku (Cemre kaydedecek, key: `meme_guesser_username`)
- Oyun sonu → Sonuç ekranından leaderboard'a link ver (`/login` veya anasayfa)
