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
    // Specific Prompt for Color Change
    const prompt = `
    TASK: Change the color of the shirt/apparel in this image to ${color.name}.
    CONSTRAINT: Keep the design/artwork on the shirt EXACTLY the same. 
    CONSTRAINT: Keep the background and shadows EXACTLY the same.
    OUTPUT: Photorealistic image.
    `;
    
    try {
        const src = await generateImage(imagePart, prompt);
        // Track usage
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
        
        // 1. MODEL PROMPT (Aggressive Close-up)
        const modelPrompt = `
        Create a LIFESTYLE MODEL MOCKUP.
        - Product: ${typeText} with the exact artwork from the source image.
        - Model: A realistic person wearing the product.
        - Zoom: EXTREME CLOSE-UP on the chest/torso area. The design must be the main focus.
        - Background: Soft blur, outdoors or coffee shop.
        - Lighting: Cinematic, high quality.
        `;

        // 2. FLAT LAY PROMPT (Aggressive Props & Composition)
        const flatLayPrompt = `
        Create a STYLIZED FLAT LAY MOCKUP.
        - Product: Folded ${typeText} with the exact artwork from the source image.
        - Surface: Textured wood or marble table.
        - DECORATION (MANDATORY): You MUST place these items around the shirt: ${props}.
        - Composition: Product in center, items scattered naturally around.
        - Zoom: TOP-DOWN CLOSE-UP. The design must be clearly visible.
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