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
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
    });

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
    const shuffled = [...MOCKUP_PROPS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3); // Pick 3 random items
    return selected.join(", "); 
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `
    ACT AS: Professional Product Retoucher.
    TASK: Recolor the apparel in this image to ${color.name}.
    RULES:
    1. KEEP the original design/artwork 100% intact.
    2. KEEP the background, shadows, and lighting exactly the same.
    3. ONLY change the fabric color of the shirt/hoodie.
    OUTPUT: High-quality photorealistic image.
    `;
    
    try {
        const src = await generateImage(imagePart, prompt);
        api.recordUsage('variation').catch(console.warn);
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
        const typeText = apparelType ? apparelType : "T-Shirt";
        const props = getRandomProps();
        
        // 1. MODEL PROMPT
        const modelPrompt = `
        ACT AS: Fashion Photographer.
        TASK: Create a Lifestyle Model Mockup for this ${typeText}.
        INPUT: Use the graphic design/artwork from the source image.
        SCENE:
        - Model: A realistic person wearing the ${typeText}.
        - Pose: Natural, standing or sitting.
        - Background: Blurred urban street or cozy cafe.
        - ZOOM: CLOSE-UP on the chest area. The artwork must be HUGE and CLEAR.
        `;

        // 2. FLAT LAY PROMPT (With Props)
        const flatLayPrompt = `
        ACT AS: Professional Product Photographer.
        TASK: Create a Stylized Flat Lay Mockup for this ${typeText}.
        INPUT: Use the graphic design/artwork from the source image.
        COMPOSITION:
        - Surface: Rustic wooden table or white marble.
        - Center: The ${typeText} folded neatly.
        - DECORATION (MANDATORY): You MUST place these items around the shirt: ${props}.
        - ZOOM: TOP-DOWN CLOSE-UP. Fill the frame with the shirt and props.
        `;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        
        const modelPromise = generateImage(imagePart, modelPrompt).then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `model${nameSuffix}_mockup.png` };
        });
        
        const flatLayPromise = generateImage(imagePart, flatLayPrompt).then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `flatlay${nameSuffix}_props.png` };
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