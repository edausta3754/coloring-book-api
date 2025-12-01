import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const HF_KEY = process.env.HF_KEY;
const apiKey = process.env.API_KEY || "test";

const ai = new GoogleGenAI({ apiKey: apiKey });
const textModel = 'gemini-1.5-flash'; 

// DEĞİŞİKLİK: FLUX yerine SDXL modeline geçtik. Çizgisel çizimlerde daha itaatkardır.
const HF_MODEL_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

interface ColoringBookIdeas {
    coverIdea: string;
    pageIdeas: string[];
}

const generateImageWithHF = async (prompt: string): Promise<string> => {
    if (!HF_KEY) throw new Error("Hugging Face API Anahtarı eksik!");

    // --- KESİN ÇÖZÜM PROMPT ---
    // Modele "Bu bir fotoğraf değil, bu bir vektör çizimidir" diyoruz.
    const strictPrompt = `(coloring book page), (black and white), (line art), (vector lines), ${prompt}, white background, no shading, no grayscale, clean lines, minimalist, kids drawing style, simple, high contrast`;

    const response = await fetch(HF_MODEL_URL, {
        headers: { Authorization: `Bearer ${HF_KEY}`, "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ inputs: strictPrompt }),
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
        const ideaPrompt = `Create a coloring book for a child named ${name}. Theme: "${theme}". 
        Generate 5 simple scene ideas. 
        IMPORTANT: Describe only the MAIN SUBJECT. Do not ask for details.
        Return JSON format.`;
        
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
        console.warn("   ! Google Yanıt Vermedi. Yedek Plan.");
        ideas = {
            coverIdea: `A coloring book title page about ${theme} for ${name}`,
            pageIdeas: [
                `${theme} main character standing`,
                `A simple ${theme} vehicle or object`,
                `${theme} in a simple landscape`,
                `Funny ${theme} action scene`,
                `Pattern of ${theme} items`
            ]
        };
    }

    // --- RESİM ÜRETİMİ ---
    console.log(`[2/3] Çizimler yapılıyor (SDXL Line Art Modu)...`);
    
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
                 // Çizilemezse beyaz boş sayfa yerine basit bir ikon denemesi
                 const fallback = await fetch("https://picsum.photos/800/600?grayscale").then(r => r.arrayBuffer());
                 generatedImages.push(Buffer.from(fallback).toString('base64'));
                 console.log("⚠️");
            }
        }
    }
    
    const [coverImage, ...pages] = generatedImages;
    console.log(`[3/3] PDF Paketleniyor...`);

    return { coverImage, pages };
};