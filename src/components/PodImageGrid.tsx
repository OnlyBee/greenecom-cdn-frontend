
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

    // Safe check for response structure
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
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
    TASK: Recolor the apparel to ${color.name}.
    STRICT RULES:
    1. Keep the original graphic design 100% identical.
    2. Keep the background and lighting 100% identical.
    3. Output a SINGLE, high-quality image.
    4. DO NOT create a collage or split screen.
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
        
        // 1. MODEL PROMPT (Lifestyle)
        const modelPrompt = `
        ROLE: Fashion Photographer.
        OBJECT: A realistic model wearing a ${typeText}.
        DESIGN: Apply the artwork from the source image onto the chest of the ${typeText}.
        SCENE: Urban street or cozy cafe background (Blurred).
        CAMERA: Portrait shot, Close-up on the torso.
        REQUIREMENT:
        - The artwork must be LARGE, CLEAR, and CENTERED.
        - Realistic fabric wrinkles and lighting.
        - SINGLE IMAGE output only. NO Collage.
        `;

        // 2. FLAT LAY PROMPT (With Mandatory Props)
        const flatLayPrompt = `
        ROLE: Product Photographer.
        OBJECT: A folded ${typeText} placed on a wooden or marble table.
        DESIGN: Apply the artwork from the source image onto the ${typeText}.
        PROPS (MANDATORY): You MUST place these items around the shirt: ${props}.
        COMPOSITION:
        - Top-down view (Flat lay).
        - Zoom in closely to show the design detail.
        - Props should act as a frame but NOT cover the design.
        - SINGLE IMAGE output only. NO Collage.
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
