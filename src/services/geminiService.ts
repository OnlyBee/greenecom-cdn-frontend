
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
    const selected = shuffled.slice(0, 3); 
    return selected.join(", "); 
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `
    ACT AS: Expert Product Retoucher.
    INPUT: An image of an apparel product with a design.
    TASK: Change the fabric color of the apparel to '${color.name}'.
    CRITICAL RULES:
    1. PRESERVE the original design/artwork pixel-perfectly.
    2. PRESERVE all original shadows, folds, and lighting.
    3. DO NOT change the background.
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
        
        // 1. MODEL MOCKUP
        const modelPrompt = `
        ACT AS: Fashion Photographer.
        TASK: Create a LIFESTYLE MODEL MOCKUP of a ${typeText}.
        INPUT: Use the design/artwork from the source image.
        
        INSTRUCTIONS:
        - MODEL: Real person, casual pose, not looking at camera.
        - ZOOM: **CLOSE-UP**. The design on the chest must be LARGE and CLEAR (occupy 50% of the frame).
        - LIGHTING: Soft, natural golden hour light.
        - BACKGROUND: Blurred urban street or coffee shop.
        - QUALITY: Photorealistic, 4k, high detail.
        `;

        // 2. FLAT LAY MOCKUP (With forced props)
        const props = getRandomProps();
        const flatLayPrompt = `
        ACT AS: Creative Director.
        TASK: Create a STYLIZED FLAT LAY MOCKUP of a folded ${typeText}.
        INPUT: Use the design/artwork from the source image.
        
        COMPOSITION RULES (MANDATORY):
        - BACKGROUND: Use a textured wood or white marble surface.
        - PROPS: You MUST place these items around the shirt: ${props}.
        - ARRANGEMENT: The shirt is in the center. Props are arranged artistically around it.
        - ZOOM: **EXTREME CLOSE-UP**. Focus on the chest area so the design is very readable.
        - STYLE: Cozy, warm, "Instagram aesthetic".
        `;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        
        const modelPromise = generateImage(imagePart, modelPrompt).then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `model${nameSuffix}_mockup.png` };
        });
        
        const flatLayPromise = generateImage(imagePart, flatLayPrompt).then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `flatlay${nameSuffix}_with_props.png` };
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
