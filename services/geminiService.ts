import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const HF_KEY = process.env.HF_KEY;
const apiKey = process.env.API_KEY || "test";

const ai = new GoogleGenAI({ apiKey: apiKey });
const textModel = 'gemini-1.5-flash'; 

// Model: SDXL (En güçlü model)
const HF_MODEL_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

interface ColoringBookIdeas {
    coverIdea: string;
    pageIdeas: string[];
}

const generateImageWithHF = async (prompt: string): Promise<string> => {
    if (!HF_KEY) throw new Error("Render ayarlarında HF_KEY tanımlanmamış!");

    // --- TEMİZLİK OPERASYONU ---
    
    // 1. POZİTİF PROMPT (Ne istiyoruz?):
    // "lineart" ve "monochrome" kelimeleri çok kritiktir.
    const finalPrompt = `kids coloring book page, ${prompt}, centered, simple, cute, vector line art, black and white, thick lines, white background, 2d, minimalist`;

    // 2. NEGATİF PROMPT (Ne İSTEMİYORUZ? - Burası gri tonları engeller):
    const negativePrompt = "shading, grayscale, gradient, gray, shadows, color, 3d, realistic, photo, detailed background, textured, noise, blurry, messy, complex";

    const response = await fetch(HF_MODEL_URL, {
        headers: { 
            Authorization: `Bearer ${HF_KEY}`, 
            "Content-Type": "application/json" 
        },
        method: "POST",
        body: JSON.stringify({ 
            inputs: finalPrompt,
            parameters: {
                negative_prompt: negativePrompt, // İşte sihir burada!
                num_inference_steps: 25, // Kaliteyi artırır
                guidance_scale: 8.0 // Prompt'a ne kadar sadık kalacağını belirler
            }
        }),
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
        // Google'dan çok çok basit, tek kelimelik objeler istiyoruz
        const ideaPrompt = `Create a coloring book for a child named ${name}. Theme: "${theme}". 
        Generate 6 VERY SIMPLE scene ideas.
        IMPORTANT: Describe only the main object. Example: "A cute cat sitting".
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
        console.warn("   ! Google Yanıt Vermedi. Yedek Fikirler.");
        ideas = {
            coverIdea: `Coloring book title page for ${name} about ${theme}`,
            pageIdeas: [
                `Cute ${theme} character`,
                `Simple ${theme} face`,
                `${theme} full body`,
                `Funny ${theme}`,
                `Small ${theme}`,
                `${theme} simple outline`
            ]
        };
    }

    // --- RESİM ÜRETİMİ ---
    console.log(`[2/3] Çizimler yapılıyor (Gölgesiz Mod)...`);
    
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
                const image = await generateImageWithHF(prompt);
                generatedImages.push(image);
                console.log("     > Başarılı ✅");
            } catch (retryErr) {
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