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

    // FIX: Added optional chaining (?.) to avoid 'Object is possibly undefined' error
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
        ROLE: Professional Fashion Photographer.
        TASK: Create a lifestyle mockup of a person wearing a ${typeText}.
        
        INSTRUCTIONS:
        - IGNORE the original background. Create a blurred Urban Street or Cafe background.
        - Apply the EXACT graphic design from the source image onto the chest of the new shirt.
        - VIEW: Close-up portrait (Mid-thigh up). The shirt design must be the MAIN FOCUS.
        - LIGHTING: Natural, soft sunlight.
        - FORMAT: Single Image. Realism: 100%.
        `;

        // 2. FLAT LAY PROMPT (With Mandatory Props)
        const flatLayPrompt = `
        ROLE: Professional Product Photographer.
        TASK: Create a creative Flat Lay composition of a folded ${typeText}.
        
        COMPOSITION RULES:
        - BACKGROUND: Wooden table or White Marble texture (IGNORE original background).
        - MANDATORY PROPS: Arrange these items around the shirt: ${props}.
        - PLACEMENT: The shirt is in the CENTER. Props are on the edges.
        - DESIGN: Apply the source graphic design clearly on the shirt.
        - ZOOM: Zoom in tightly so the design detail is clearly visible.
        - FORMAT: Single Image. Realism: 100%.
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