const express = require('express');
const cors = require('cors');
const path = require('path');
const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(cors());

// Backblaze B2 S3 Client
const s3 = new S3Client({
  endpoint: process.env.B2_ENDPOINT, // https://s3.us-east-005.backblazeb2.com
  region: process.env.B2_REGION || 'us-east-005',
  forcePathStyle: true,
  bucketEndpoint: false,
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
  const key = `${gameId}.zip`;

  try {
    // önce dosya var mı kontrol et
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));

    // dosya varsa signed URL üret
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 dk geçerli

    res.json({ signedUrl });
  } catch (err) {
    // dosya bulunmazsa 404 döner
    if (err.$metadata?.httpStatusCode === 404) {
      console.log(`Dosya bulunamadı: ${key}`);
      return res.json({ signedUrl: null });
    }

    console.error('Signed URL oluşturulurken hata:', err);
    res.status(500).json({ signedUrl: null });
  }
});

// Download proxy (isteğe bağlı)
app.get('/download/:gameId', async (req, res) => {
  const { gameId } = req.params;
  const key = `${gameId}.zip`;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); // dosya var mı kontrol et

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    res.redirect(signedUrl);
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404) {
      return res.status(404).send('Dosya bulunamadı');
    }

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
