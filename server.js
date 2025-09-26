const express = require('express');
const cors = require('cors');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(cors());

// Backblaze B2 S3 Client
const s3 = new S3Client({
  endpoint: process.env.B2_ENDPOINT, // Örn: https://s3.us-east-005.backblazeb2.com
  region: process.env.B2_REGION || 'us-east-005',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

const BUCKET = process.env.B2_BUCKET;

// Statik dosyalar (public klasörü)
app.use(express.static(path.join(__dirname, 'public')));

// Signed URL endpoint
app.get('/get-signed-url/:gameId', async (req, res) => {
  const { gameId } = req.params;

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `${gameId}.zip`,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    res.json({ signedUrl });
  } catch (err) {
    console.error('Signed URL oluşturulurken hata:', err);
    res.status(500).json({ signedUrl: null });
  }
});

// Download proxy (isteğe bağlı)
app.get('/download/:gameId', async (req, res) => {
  const { gameId } = req.params;

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `${gameId}.zip`,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    res.redirect(signedUrl);
  } catch (err) {
    console.error('Download sırasında hata:', err);
    res.status(500).send('Beklenmedik bir hata oluştu');
  }
});

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucu başlat
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend çalışıyor: http://localhost:${port}`));
