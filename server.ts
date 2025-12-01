import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs'; 
import path from 'path'; 
import { generateColoringPages } from './services/geminiService';
import { createColoringBookPdf } from './services/pdfService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Projenin çalıştığı klasörde 'pdf_arsivi' klasörü oluşturulacak
const OUTPUT_FOLDER = path.join(process.cwd(), 'pdf_arsivi');

// Klasör yoksa oluştur
if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
    console.log(`📂 Kayıt klasörü oluşturuldu: ${OUTPUT_FOLDER}`);
}

app.get('/', (req, res) => {
    res.send('Boyama Kitabı Fabrikası Çalışıyor! 🤖🎨');
});

app.post('/generate-book', async (req, res) => {
    try {
        const { childName, theme } = req.body;

        if (!childName || !theme) {
            return res.status(400).json({ error: "Eksik bilgi: childName ve theme zorunludur." });
        }

        console.log(`\n>>> YENİ SİPARİŞ: ${childName} - ${theme}`);

        // 1. Resim ve İçerik Üretimi
        const { coverImage, pages } = await generateColoringPages(theme, childName);

        // 2. PDF Oluşturma
        const pdfBuffer = await createColoringBookPdf(coverImage, pages, childName, theme);

        // 3. Dosya İsmi (Türkçe karakter temizliği + Tarih)
        const safeName = childName.replace(/[^a-zA-Z0-9]/g, '_');
        const safeTheme = theme.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); 
        const fileName = `${safeName}_${safeTheme}_${timestamp}.pdf`;

        // 4. Dosyayı Arşiv Klasörüne Kaydet
        const filePath = path.join(OUTPUT_FOLDER, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        
        console.log(`💾 ARŞİVLENDİ: ${filePath}`);

        // 5. İstemciye (Curl/Make) Yanıt Gönder
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(pdfBuffer);

        console.log(`<<< SİPARİŞ TAMAMLANDI.`);

    } catch (error: any) {
        console.error("!!! İŞLEM HATASI:", error);
        res.status(500).json({ 
            error: "Kitap oluşturulurken hata oluştu.", 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
    console.log(`📂 PDF'ler buraya kaydedilecek: ${OUTPUT_FOLDER}`);
});