const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(cors());

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Statik dosyaları sun
app.use(express.static(path.join(__dirname, 'public')));

// GET Signed URL endpoint (frontend ile uyumlu)
app.get('/get-signed-url/:gameId', async (req, res) => {
  const { gameId } = req.params;

  try {
    const { data, error } = await supabase
      .storage
      .from('zip-files')
      .createSignedUrl(`${gameId}.zip`, 60); // 1 dakika geçerli

    if (error || !data.signedUrl) {
      return res.json({ signedUrl: null });
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ signedUrl: data.signedUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ signedUrl: null });
  }
});

// Proxy ile direkt download endpoint (isteğe bağlı)
app.get('/download/:gameId', async (req, res) => {
  const { gameId } = req.params;

  try {
    const { data, error } = await supabase
      .storage
      .from('zip-files')
      .createSignedUrl(`${gameId}.zip`, 60);

    if (error || !data.signedUrl) return res.status(404).send('Dosya bulunamadı');

    res.redirect(data.signedUrl); // Direkt kullanıcıyı signed URL’e yönlendir

  } catch (err) {
    console.error(err);
    res.status(500).send('Beklenmedik bir hata oluştu');
  }
});

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend çalışıyor: http://localhost:${port}`));
