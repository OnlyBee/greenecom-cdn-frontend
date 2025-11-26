
import { GoogleGenAI } from "@google/genai";
import type { GeneratedImage, Color, ApparelType } from "../podTypes";
import { getApiKey } from '../utils/apiKey';
import { MOCKUP_PROPS } from '../podConstants';
import { api } from './api';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

const generateImage = async (imagePart: any, prompt: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key not found.");

    const ai = new GoogleGenAI({ apiKey });
    
    // Call generateContent. Note: gemini-2.5-flash-image returns the image in the response structure.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
    });

    // Robustly find the image part
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("AI generated text instead of image. Please try again.");
};

const getRandomProps = (): string => {
    // Randomly shuffle and pick 3 items
    const shuffled = [...MOCKUP_PROPS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3); 
    return selected.join(", "); 
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `
    ACT AS: Expert Product Retoucher.
    INPUT: An image of an apparel product with a design.
    TASK: Recolor the fabric of the apparel to exactly '${color.name}'.
    RULES:
    1. KEEP the original design/artwork 100% unchanged.
    2. KEEP the original lighting, wrinkles, and shadows realistic.
    3. DO NOT change the background.
    4. OUTPUT: High-quality realistic image.
    `;
    
    try {
        const src = await generateImage(imagePart, prompt);
        // Track usage silently
        api.recordUsage('variation').catch(e => console.warn("Stats error", e));
        return { src, name: `${color.name}_variation.png` };
    } catch (e) { 
        console.error(e);
        throw e; 
    }
  });
  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    
    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const typeText = apparelType ? apparelType : "t-shirt/sweatshirt";
        
        // --- LOGIC: MODEL PROMPT ---
        const modelPrompt = `
        ACT AS: Fashion Photographer.
        INPUT: Image of a shirt with a design.
        TASK: Generate a LIFESTYLE MOCKUP of a real person wearing a ${typeText}.
        
        CRITICAL INSTRUCTIONS:
        1. EXTRACT the design from the source image and place it PERFECTLY on the new shirt.
        2. ZOOM LEVEL: CLOSE-UP / PORTRAIT. The chest area and design must occupy 70% of the image.
        3. MODEL: A diverse model, natural pose, looking at camera or smiling.
        4. BACKGROUND: Blurred city street or cozy cafe. High depth of field.
        5. LIGHTING: Golden hour or soft studio lighting.
        `;

        // --- LOGIC: FLAT LAY PROMPT ---
        const props = getRandomProps();
        const flatLayPrompt = `
        ACT AS: Professional Product Photographer.
        INPUT: Image of a shirt with a design.
        TASK: Generate a CREATIVE FLAT LAY of a folded ${typeText}.
        
        MANDATORY SCENE COMPOSITION:
        1. BACKGROUND: Use a textured WOODEN or MARBLE surface. DO NOT use a plain white background.
        2. DECORATION: You MUST place these exact items around the shirt: ${props}.
        3. ARRANGEMENT: Place the props artistically in the corners or sides. Do NOT cover the design.
        4. ZOOM: CLOSE-UP. The shirt design must be clearly visible and sharp.
        5. LIGHTING: Bright, natural window light with soft shadows.
        
        The result must look like a high-end Etsy product listing.
        `;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        
        const modelPromise = generateImage(imagePart, modelPrompt).then(src => {
            api.recordUsage('mockup').catch(e => console.warn(e));
            return { src, name: `model${nameSuffix}_mockup.png` };
        });
        
        const flatLayPromise = generateImage(imagePart, flatLayPrompt).then(src => {
            api.recordUsage('mockup').catch(e => console.warn(e));
            return { src, name: `flatlay${nameSuffix}_mockup.png` };
        });

        return [modelPromise, flatLayPromise];
    };

    let allPromises: Promise<GeneratedImage>[] = [];
    if (apparelTypes.length === 0) {
        allPromises = createMockupPromises(null);
    } else {
        apparelTypes.forEach(type => allPromises.push(...createMockupPromises(type)));
    }
    return Promise.all(allPromises);
};
