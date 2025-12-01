import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const HF_KEY = process.env.HF_KEY;
// API Key yoksa test modunda devam et
const apiKey = process.env.API_KEY || "test";

const ai = new GoogleGenAI({ apiKey: apiKey });
const textModel = 'gemini-1.5-flash'; 

// Hugging Face FLUX Modeli
const HF_MODEL_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

interface ColoringBookIdeas {
    coverIdea: string;
    pageIdeas: string[];
}

const generateImageWithHF = async (prompt: string): Promise<string> => {
    if (!HF_KEY) throw new Error("Hugging Face API Anahtarı eksik!");

    // --- PROMPT MÜHENDİSLİĞİ (GÜNCELLENDİ) ---
    // Buraya "Negatif Prompt" mantığını cümle içinde yediriyoruz.
    // FLUX bazen negatif prompt desteklemez, o yüzden pozitifi güçlendiriyoruz.
    const strictStyle = "kids coloring book page, heavy black outlines, stark white background, simple line art, vector style, no shading, no grayscale, monochrome, 2d, flat design, minimalist, cute, masterpiece. Subject: ";

    const fullPrompt = strictStyle + prompt;

    const response = await fetch(HF_MODEL_URL, {
        headers: { Authorization: `Bearer ${HF_KEY}`, "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ inputs: fullPrompt }),
    });

    if (!response.ok) {
        const errText = await response.text();
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
        console.log("   > Google'dan fikir isteniyor...");
        const ideaPrompt = `Create a coloring book for a child named ${name}. Theme: "${theme}". 
        Generate 5 UNIQUE scene ideas.
        IMPORTANT: The descriptions must be for SIMPLE LINE ART. Focus on shapes, ignore lighting.
        1. Landscape/Background (Simple)
        2. Object/Vehicle (Iconic)
        3. Character close-up (Cute)
        4. Action scene (Clear)
        5. Pattern/Items (Simple)
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
        console.warn("   ! B Planı Devrede.");
        ideas = {
            coverIdea: `Big title text ${theme} coloring book for ${name}, simple outlines`,
            pageIdeas: [
                `Simple landscape of ${theme} world, thick lines`,
                `Cute ${theme} character face, simple vector`,
                `A single ${theme} object in the center, white background`,
                `${theme} running fast, motion lines, simple`,
                `Pattern of small ${theme} icons, minimalist`
            ]
        };
    }

    // --- RESİM ÜRETİMİ ---
    console.log(`[2/3] Çizimler yapılıyor (Keskin Çizgi Modu)...`);
    
    const imagePrompts = [ideas.coverIdea, ...ideas.pageIdeas];
    const generatedImages: string[] = [];
    
    for (const [i, prompt] of imagePrompts.entries()) {
        process.stdout.write(`   > Resim ${i + 1} `);
        try {
            const image = await generateImageWithHF(prompt);
            generatedImages.push(image);
            console.log("✅");
        } catch (err) {
            console.log("❌ (Tekrar deneniyor)");
            try {
                const image = await generateImageWithHF(prompt);
                generatedImages.push(image);
                console.log("   > Başarılı ✅");
            } catch (retryErr) {
                 const fallback = await fetch("https://picsum.photos/800/600?grayscale").then(r => r.arrayBuffer());
                 generatedImages.push(Buffer.from(fallback).toString('base64'));
                 console.log("⚠️ (Örnek resim)");
            }
        }
    }
    
    const [coverImage, ...pages] = generatedImages;
    console.log(`[3/3] PDF Paketleniyor...`);

    return { coverImage, pages };
};