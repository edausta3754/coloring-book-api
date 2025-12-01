import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const HF_KEY = process.env.HF_KEY;
const apiKey = process.env.API_KEY || "test";

const ai = new GoogleGenAI({ apiKey: apiKey });
const textModel = 'gemini-1.5-flash'; 

// Model: SDXL (Çizim için en iyisi)
const HF_MODEL_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

interface ColoringBookIdeas {
    coverIdea: string;
    pageIdeas: string[];
}

const generateImageWithHF = async (prompt: string): Promise<string> => {
    if (!HF_KEY) throw new Error("Render ayarlarında HF_KEY tanımlanmamış!");

    // --- SADE VE NET PROMPT ---
    const simplePrompt = `coloring book page of ${prompt}, black and white, simple line art, white background, clean lines, no shading, kids drawing`;

    const response = await fetch(HF_MODEL_URL, {
        headers: { 
            Authorization: `Bearer ${HF_KEY}`, 
            "Content-Type": "application/json" 
        },
        method: "POST",
        body: JSON.stringify({ inputs: simplePrompt }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`🔴 HF API HATASI: ${response.status} - ${errText}`);
        throw new Error(`HF Hatası: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
};

export const generateColoringPages = async (theme: string, name: string): Promise<{ coverImage: string; pages: string[] }> => {
    
    console.log(`[1/3] İşlem Başladı: ${theme}`);
    let ideas: ColoringBookIdeas;

    // --- METİN ÜRETİMİ ---
    try {
        // GÜNCELLEME: 5 yerine 6 fikir istiyoruz
        const ideaPrompt = `Create a coloring book for a child named ${name}. Theme: "${theme}". 
        Generate 6 simple and cute scene ideas. 
        Keep descriptions short and clear.
        Return JSON.`;
        
        const ideaResponse = await ai.models.generateContent({
            model: textModel,
            contents: ideaPrompt,
            config: { responseMimeType: "application/json" }
        });

        let text = "";
        if (typeof ideaResponse.text === 'function') text = ideaResponse.text();
        else if (typeof ideaResponse.text === 'string') text = ideaResponse.text;
        else text = JSON.stringify(ideaResponse);
        
        text = text.replace(/```json|```/g, '').trim();
        ideas = JSON.parse(text) as ColoringBookIdeas;

    } catch (e) {
        console.warn("   ! Google Yanıt Vermedi. Yedek Basit Fikirler.");
        // GÜNCELLEME: B Planı için de 6. maddeyi ekledik
        ideas = {
            coverIdea: `Coloring book title page for ${name} about ${theme}`,
            pageIdeas: [
                `Cute ${theme} character`,
                `Simple ${theme} scene`,
                `Funny ${theme} playing`,
                `${theme} object`,
                `Happy ${theme} friends`,
                `Detailed ${theme} pattern` // 6. Sayfa
            ]
        };
    }

    // --- RESİM ÜRETİMİ ---
    console.log(`[2/3] Çizimler yapılıyor (Toplam 7 Resim)...`);
    
    const imagePrompts = [ideas.coverIdea, ...ideas.pageIdeas];
    const generatedImages: string[] = [];
    
    for (const [i, prompt] of imagePrompts.entries()) {
        process.stdout.write(`   > Resim ${i + 1} `);
        try {
            const image = await generateImageWithHF(prompt);
            generatedImages.push(image);
            console.log("✅");
        } catch (err: any) {
            console.log("❌");
            try {
                // Hata olursa tekrar dene
                const image = await generateImageWithHF(prompt);
                generatedImages.push(image);
                console.log("     > Başarılı ✅");
            } catch (retryErr) {
                 // Çizilemezse örnek resim
                 const fallback = await fetch("https://picsum.photos/800/600?grayscale").then(r => r.arrayBuffer());
                 generatedImages.push(Buffer.from(fallback).toString('base64'));
                 console.log("     ⚠️ (Hata)");
            }
        }
    }
    
    const [coverImage, ...pages] = generatedImages;
    console.log(`[3/3] PDF Paketleniyor...`);

    return { coverImage, pages };
};