const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Frontend dosyalarını serve et
app.use(express.static(path.join(__dirname, 'public')));

// Root route - index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// API endpoint
app.get('/get-signed-url/:gameId', async (req, res) => {
    const { gameId } = req.params;
    try {
        const { data, error } = await supabase
            .storage
            .from('zip-files')
            .createSignedUrl(`${gameId}.zip`, 300); // 5 dakika
        if (error) return res.status(500).json({ error: error.message });
        res.json({ signedUrl: data.signedUrl });
    } catch (err) {
        res.status(500).json({ error: 'Unexpected error occurred' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend + Frontend running on port ${port}`));
