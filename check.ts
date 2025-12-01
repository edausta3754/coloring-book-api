import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function listModels() {
    try {
        console.log("Modeller aranıyor...");
        const response = await ai.models.list();
        
        console.log("\n--- SENİN HESABINDAKİ AKTİF MODELLER ---");
        // Sadece generateContent (Metin) ve generateImages (Resim) yeteneği olanları filtreleyelim
        response.models?.forEach(m => {
            if (m.name?.includes('gemini') || m.name?.includes('imagen')) {
                console.log(`- ${m.name}`); // Modelin tam ismini yazdır
            }
        });
        console.log("------------------------------------------\n");
    } catch (e) {
        console.error("Hata:", e);
    }
}

listModels();

