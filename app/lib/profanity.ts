// ============================================
// KÜFÜR FİLTRESİ
// Kaynak: github.com/90pixel/kufur-filtresi
// Hard: Kelime içinde geçse bile filtrele
// Soft: Sadece tam kelime eşleşmesinde filtrele
// ============================================

// Hard list: bu parçalar herhangi bir yerde geçerse filtrele
const HARD_WORDS = [
  "ambiti", "amcık", "amck", "amık", "amını", "amına", "amında", "amsalak",
  "dalyarak", "daşak", "daşağı", "daşşak", "daşşağı",
  "domal", "fahişe", "folloş", "fuck",
  "gavat", "godoş", "göt",
  "hasiktir", "hassiktir",
  "ibne", "ipne",
  "kahpe", "kahbe", "kaltak", "kaltağ", "kancık", "kancığ", "kavat",
  "kerane", "kerhane", "kevaşe",
  "mastırbasyon", "masturbasyon", "mastürbasyon",
  "orosbu", "orospu", "orusbu", "oruspu", "orsp",
  "pezevenk", "pzvnk", "puşt", "qavat",
  "sakso", "sıçar", "sıçayım", "sıçmak", "sıçsın",
  "sikem", "siker", "sikeyim", "sikici", "sikik", "sikim", "sikiş",
  "sikle", "sikme", "siktir", "sktr", "siktiği",
  "sokarım", "sokayım", "sürtük", "sperm",
  "taşak", "taşağa", "taşağı", "taşşak", "taşşağa", "taşşağı",
  "vajina", "yalaka", "yarağ", "yarra", "yrrk",
  // Ek İngilizce
  "shit", "bitch", "dick", "pussy", "ass",
];

// Soft list: sadece tam kelime olarak geçerse filtrele
const SOFT_WORDS = [
  "am", "aq", "amk", "çük", "döl", "oç", "piç", "sik", "yarak", "penis",
];

// Türkçe karakter normalleştirme (bypass engelleme)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, ""); // nokta, tire, boşluk vb. bypass engeli
}

/**
 * Kullanıcı adında küfür kontrolü yapar.
 * @returns Tespit edilen ilk küfür kelimesi veya null
 */
export function checkProfanity(username: string): string | null {
  const normalized = normalize(username);
  const original = username.toLowerCase();

  // Hard: substring kontrolü (kelime parçası bile yeterli)
  for (const word of HARD_WORDS) {
    const normalizedWord = normalize(word);
    if (normalized.includes(normalizedWord)) {
      return word;
    }
  }

  // Soft: tam kelime eşleşmesi
  // Orijinal metni kelime kelime ayırıp kontrol et
  const words = original.split(/[\s_\-\.]+/);
  for (const w of words) {
    const normalizedW = normalize(w);
    for (const softWord of SOFT_WORDS) {
      if (normalizedW === normalize(softWord)) {
        return softWord;
      }
    }
  }

  return null;
}

/**
 * Kullanıcı adı validasyonu — küfür + format kontrolü.
 * @returns Hata mesajı veya boş string (geçerli)
 */
export function validateUsername(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Kullanıcı adı boş bırakılamaz.";
  if (trimmed.length < 2) return "İsim en az 2 karakter olmalı.";
  if (trimmed.length > 20) return "İsim en fazla 20 karakter olmalı.";
  
  const allowedChars = /^[a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s_\-]+$/;
  if (!allowedChars.test(trimmed)) return "Geçersiz karakterler.";
  
  const found = checkProfanity(trimmed);
  if (found) return "Bu ismi kullanamazsın!";
  
  return "";
}
