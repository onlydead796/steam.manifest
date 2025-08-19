const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fetch = require('node-fetch'); // node-fetch modülünü yükle: npm i node-fetch@2

const app = express();
app.use(cors());

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Statik dosyaları sun
app.use(express.static(path.join(__dirname, 'public')));

// Proxy ile download endpoint
app.get('/download/:gameId', async (req, res) => {
  const { gameId } = req.params;

  try {
    const { data, error } = await supabase
      .storage
      .from('zip-files')
      .createSignedUrl(`${gameId}.zip`, 60); // 1 dakika geçerli

    if (error || !data.signedUrl) return res.status(404).send('Dosya bulunamadı');

    const fileRes = await fetch(data.signedUrl);
    if (!fileRes.ok) return res.status(500).send('Dosya indirilemiyor');

    const arrayBuffer = await fileRes.arrayBuffer();
    res.setHeader('Content-Disposition', `attachment; filename="${gameId}.zip"`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(Buffer.from(arrayBuffer));

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
