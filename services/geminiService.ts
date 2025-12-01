import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const HF_KEY = process.env.HF_KEY;
const apiKey = process.env.API_KEY || "test";

const ai = new GoogleGenAI({ apiKey: apiKey });
const textModel = 'gemini-1.5-flash'; 

// Hugging Face'in çalışan güncel adresi
const HF_MODEL_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

interface ColoringBookIdeas {
    coverIdea: string;
    pageIdeas: string[];
}

// --- Yardımcı: Hugging Face ile Resim Çiz ---
const generateImageWithHF = async (prompt: string): Promise<string> => {
    if (!HF_KEY) throw new Error("Hugging Face API Anahtarı eksik!");

    // Prompt'u güçlendiriyoruz: İnsan yerine konsepte odaklansın
    const enhancedPrompt = prompt + ", no humans, fantasy style, coloring book style";

    const response = await fetch(HF_MODEL_URL, {
        headers: { Authorization: `Bearer ${HF_KEY}`, "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ inputs: enhancedPrompt }),
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

    // --- BÖLÜM 1: METİN ÜRETİMİ ---
    try {
        console.log("   > Google'dan yaratıcı fikirler isteniyor...");
        // Google'a özellikle "ÇEŞİTLİLİK" emri veriyoruz
        const ideaPrompt = `Create a coloring book for a child named ${name}. Theme: "${theme}". 
        Generate 5 UNIQUE scene ideas. 
        IMPORTANT RULES for diversity:
        1. One page must be a LANDSCAPE/BACKGROUND scene (no characters).
        2. One page must be an OBJECT or VEHICLE specific to the theme.
        3. One page must be a funny ACTION scene.
        4. Do not repeat the same character design.
        Return JSON: { "coverIdea": "string", "pageIdeas": ["string", "string", "string", "string", "string"] }`;
        
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
        console.log("   > Google başarıyla fikir üretti! 🎉");

    } catch (e) {
        console.warn("   ! Google Yanıt Vermedi. Gelişmiş B Planı Devrede. 🛡️");
        
        // --- GÜNCELLENMİŞ B PLANI (MANUEL ÇEŞİTLİLİK) ---
        // Burada her satır farklı bir açıdan çizim istiyor.
        ideas = {
            coverIdea: `A big bold text title page with ${theme} elements and name ${name}`,
            pageIdeas: [
                // 1. Manzara / Dünya
                `A wide landscape view of the ${theme} world, scenery, background details, no humans`,
                // 2. Ana Karakter (Yakın Çekim)
                `A cute non-human ${theme} character close-up portrait, detailed face`,
                // 3. Obje / Araç
                `A vehicle, machine, or magical object related to ${theme}, full body view`,
                // 4. Aksiyon
                `Dynamic scene of ${theme} flying or moving fast, action lines`,
                // 5. Desen / Topluluk
                `A pattern of many small items related to ${theme}, floating items`
            ]
        };
    }

    // --- BÖLÜM 2: RESİM ÜRETİMİ ---
    console.log(`[2/3] Çizimler yapılıyor (Çeşitlilik Modu)...`);
    
    // Stil komutunu güncelledik: "No humans" (insan yok) uyarısı ekledik.
    // Eğer tema insan gerektiriyorsa bu promptu yumuşatabiliriz ama robot/uzay için bu iyidir.
    const stylePrefix = "coloring book page for kids, black and white, thick lines, white background, vector style. Subject: ";

    const imagePrompts = [ideas.coverIdea, ...ideas.pageIdeas].map(idea => stylePrefix + idea);
    const generatedImages: string[] = [];
    
    for (const [i, prompt] of imagePrompts.entries()) {
        process.stdout.write(`   > Resim ${i + 1} `);
        try {
            const image = await generateImageWithHF(prompt);
            generatedImages.push(image);
            console.log("✅");
        } catch (err: any) {
            console.log("❌ (Tekrar deneniyor)");
            try {
                const image = await generateImageWithHF(prompt);
                generatedImages.push(image);
                console.log("   > Başarılı ✅");
            } catch (retryErr) {
                 // Son çare placeholder
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