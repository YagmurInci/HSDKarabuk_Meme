'use client';

import { useState, useEffect, useCallback } from 'react';

// --- TİP TANIMLAMALARI ---
interface Option {
  id: string;
  text: string;
}

interface Meme {
  id: string;
  youtubeUrl: string;
  startTime: number;
  endTime: number;
  correctOption?: Option;
}

export default function BackofficePage() {
  // --- KİMLİK DOĞRULAMA STATE'LERİ ---
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- VERİ STATE'LERİ ---
  const [options, setOptions] = useState<Option[]>([]);
  const [memes, setMemes] = useState<Meme[]>([]);

  // --- FORM STATE'LERİ ---
  const [optionText, setOptionText] = useState('');
  
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [correctOptionId, setCorrectOptionId] = useState('');

  // 1. API'DEN VERİLERİ ÇEKME FONKSİYONU
  const fetchData = useCallback(async () => {
    try {
      const optRes = await fetch('/api/admin/options', { headers: { 'x-admin-password': password } });
      if (optRes.ok) setOptions(await optRes.json());

      const memeRes = await fetch('/api/admin/memes', { headers: { 'x-admin-password': password } });
      if (memeRes.ok) setMemes(await memeRes.json());
    } catch (error) {
      console.error("Veriler çekilirken hata oluştu:", error);
    }
  }, [password]);

  // (useEffect hatası giderildi)
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // 2. GİRİŞ YAPMA FONKSİYONU
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'hackathon-admin-2026') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Hatalı şifre!');
    }
  };

  // 3. YENİ ŞIK EKLEME FONKSİYONU
  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionText) return alert('Şık metni boş olamaz!');

    const res = await fetch('/api/admin/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ text: optionText })
    });

    if (res.ok) {
      setOptionText('');
      fetchData();
      alert('Şık başarıyla eklendi!');
    } else {
      const data = await res.json();
      alert(`Hata: ${data.error}`);
    }
  };

  // 4. ŞIK SİLME FONKSİYONU
  const handleDeleteOption = async (id: string) => {
    if (!window.confirm('Bu şıkkı silmek istediğinize emin misiniz?')) return;
    
    const res = await fetch(`/api/admin/options?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password }
    });

    if (res.ok) fetchData();
    else alert('Silinemedi. Bu şık bir Meme içinde kullanılıyor olabilir.');
  };

  // 5. YENİ MEME EKLEME FONKSİYONU
  const handleAddMeme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl || !startTime || !endTime || !correctOptionId) {
      return alert('Lütfen tüm alanları doldurun!');
    }

    const res = await fetch('/api/admin/memes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({
        youtubeUrl,
        startTime: Number(startTime),
        endTime: Number(endTime),
        correctOptionId
      })
    });

    if (res.ok) {
      setYoutubeUrl(''); setStartTime(''); setEndTime(''); setCorrectOptionId('');
      fetchData();
      alert('Meme başarıyla eklendi!');
    } else {
      const data = await res.json();
      alert(`Hata: ${data.error}`);
    }
  };

  // 6. MEME SİLME FONKSİYONU
  const handleDeleteMeme = async (id: string) => {
    if (!window.confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
    
    const res = await fetch(`/api/admin/memes?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password }
    });

    if (res.ok) fetchData();
    else alert('Meme silinirken bir hata oluştu.');
  };

  return (
    <main id="admin-page" className="admin-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="admin-title">Meme Guesser - Admin Panel</h1>

      {!isAuthenticated ? (
        <div id="admin-auth" className="admin-auth-section" style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
          <form onSubmit={handleLogin}>
            <label className="admin-label">Admin Şifresi: </label>
            <input 
              className="admin-password-input" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ marginRight: '10px', padding: '5px' }}
            />
            <button className="admin-login-btn" type="submit" style={{ padding: '5px 15px' }}>Giriş</button>
          </form>
          {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
        </div>
      ) : (
        <div id="admin-panels">
          <p style={{ color: 'green', fontWeight: 'bold' }}>Giriş başarılı! Sistem aktif. 🔓</p>

          {/* ================= ŞIK YÖNETİMİ ================= */}
          <section id="option-management" className="admin-section" style={{ marginTop: '2rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
            <h2>1. Şık (Cevap) Havuzu Yönetimi</h2>
            <form onSubmit={handleAddOption} style={{ marginBottom: '1rem' }}>
              <input 
                className="admin-input" 
                placeholder="Örn: Kedi mi köpek mi?" 
                value={optionText}
                onChange={(e) => setOptionText(e.target.value)}
                style={{ padding: '5px', marginRight: '10px', width: '60%' }}
              />
              <button className="admin-btn" type="submit" style={{ padding: '5px 15px' }}>Şık Ekle</button>
            </form>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
              {options.length === 0 ? <p>Henüz şık eklenmemiş.</p> : (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {options.map((opt) => (
                    <li key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #eee' }}>
                      <span>{opt.text}</span>
                      <button onClick={() => handleDeleteOption(opt.id)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none' }}>Sil</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ================= MEME YÖNETİMİ ================= */}
          <section id="meme-management" className="admin-section" style={{ marginTop: '2rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
            <h2>2. Soru (Meme) Yönetimi</h2>
            <form onSubmit={handleAddMeme} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
              <input 
                className="admin-input" 
                placeholder="YouTube URL" 
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                style={{ padding: '5px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  className="admin-input" 
                  type="number" 
                  placeholder="Başlangıç (sn)" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{ padding: '5px', width: '50%' }}
                />
                <input 
                  className="admin-input" 
                  type="number" 
                  placeholder="Bitiş (sn)" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ padding: '5px', width: '50%' }}
                />
              </div>
              <select 
                className="admin-select" 
                value={correctOptionId}
                onChange={(e) => setCorrectOptionId(e.target.value)}
                style={{ padding: '5px' }}
              >
                <option value="">Doğru cevabı seçin...</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.text}</option>
                ))}
              </select>
              <button className="admin-btn" type="submit" style={{ padding: '8px', background: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}>
                Meme Ekle
              </button>
            </form>

            <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
              {memes.length === 0 ? <p>Henüz meme eklenmemiş.</p> : (
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {memes.map((meme) => (
                    <li key={meme.id} style={{ marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                      <div><strong>URL:</strong> {meme.youtubeUrl}</div>
                      <div><strong>Zaman:</strong> {meme.startTime}s - {meme.endTime}s</div>
                      <div><strong>Cevap:</strong> {meme.correctOption?.text || "Bilinmiyor"}</div>
                      
                      <button onClick={() => handleDeleteMeme(meme.id)} style={{ color: 'red', marginTop: '5px', cursor: 'pointer', background: 'none', border: 'none' }}>Meme Sil</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section id="leaderboard-moderation" className="admin-section" style={{ marginTop: '2rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
            <h2>3. Liderlik Tablosu Moderasyonu</h2>
            
            <p>Leaderboard sistemi eklendiğinde burası aktifleşecek...</p>
          </section>

        </div>
      )}
    </main>
  );
}