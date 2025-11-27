import { GoogleGenAI, Modality } from "@google/genai";
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

const getRandomProps = (): string => {
    const shuffled = [...MOCKUP_PROPS].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 2) + 2; 
    const selected = shuffled.slice(0, count);
    return selected.join(", ");
};

const generateImage = async (imagePart: any, prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key not found. Please set your API key.");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [imagePart, { text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: { aspectRatio: aspectRatio }
        },
    });

    // FIX TS ERROR HERE: Optional Chaining
    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    throw new Error("No image was generated.");
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  
  // TRACKING
  try { await api.recordUsage('variation'); } catch(e) {}

  const promises = selectedColors.map(async (color) => {
    const prompt = `Analyze the apparel. KEEP THE DESIGN EXACTLY AS IS. Change ONLY the fabric color to '${color.name}'. Keep folds and shadows realistic. White background.`;
    const src = await generateImage(imagePart, prompt, "1:1");
    return { src, name: `${color.name}.png` };
  });

  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    
    // TRACKING
    try { await api.recordUsage('mockup'); } catch(e) {}

    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const typeStr = apparelType || "apparel";
        const props = getRandomProps();

        // STRONG PROMPT FOR FLATLAY
        const flatLayPrompt = `
        ROLE: Professional Product Photographer.
        TASK: Create a High-End Flatlay Mockup.
        OBJECT: ${typeStr} with the EXACT design from source image.
        BACKGROUND: Wooden table or Marble surface.
        DECORATION (MANDATORY): Place these items around the shirt: ${props}.
        COMPOSITION: Top-down view. ZOOM IN CLOSELY to the chest area to show the design details. 
        IMPORTANT: 
        1. REMOVE original background completely. 
        2. The design must be sharp and centered.
        3. Realistic shadows and lighting.
        `;

        // STRONG PROMPT FOR MODEL
        const modelPrompt = `
        ROLE: Fashion Photographer.
        TASK: Create a Lifestyle Model Mockup.
        OBJECT: A model wearing the ${typeStr}.
        VIEW: Close-up shot from waist up.
        BACKGROUND: Blurred street or studio background.
        IMPORTANT: 
        1. Use a NEW model. 
        2. ZOOM IN to the design. 
        3. Keep the design colors 100% accurate.
        `;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase()}` : '';

        const modelPromise = generateImage(imagePart, modelPrompt, "1:1").then(src => ({ src, name: `model${nameSuffix}.png` }));
        const flatLayPromise = generateImage(imagePart, flatLayPrompt, "1:1").then(src => ({ src, name: `flatlay${nameSuffix}_${Date.now()}.png` }));

        return [modelPromise, flatLayPromise];
    };

    let allPromises: Promise<GeneratedImage>[] = [];
    if (apparelTypes.length === 0) {
        allPromises = createMockupPromises(null);
    } else {
        apparelTypes.forEach(type => {
            allPromises.push(...createMockupPromises(type));
        });
    }

    return Promise.all(allPromises);
};