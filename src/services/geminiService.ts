
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

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image was generated.");
};

const getRandomProps = (): string => {
    const shuffled = [...MOCKUP_PROPS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).join(", "); 
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Analyze the apparel in the provided image. The design/artwork on the apparel must be preserved EXACTLY as is. 
    TASK: Change ONLY the fabric color of the apparel to '${color.name}'. 
    CONSTRAINT: Do NOT change the background. Do NOT change the design. Keep the lighting and shadows realistic.`;
    
    try {
        const src = await generateImage(imagePart, prompt);
        // Track usage silently
        api.recordUsage('variation').catch(e => console.error("Tracking error:", e));
        return { src, name: `${color.name}.png` };
    } catch (e) { throw e; }
  });
  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    
    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const basePrompt = `Analyze the provided image. Identify the graphic design/artwork on the chest. You MUST preserve this design exactly in the new image.`;
        const typeText = apparelType ? apparelType : "apparel";

        // MODEL PROMPT (Close-up focus)
        const modelPrompt = `${basePrompt}
        TASK: Generate a photorealistic mockup of a model wearing a ${typeText}.
        ZOOM: EXTREME CLOSE-UP on the torso/chest area. The design must be LARGE, CLEAR, and CENTERED. Do not show legs.
        STYLE: Professional, clean, studio lighting. Neutral background.`;

        // FLAT LAY PROMPT (Random Props + Close-up)
        const randomProps = getRandomProps();
        const flatLayPrompt = `${basePrompt}
        TASK: Generate a photorealistic flat-lay mockup of a ${typeText} placed on a wooden or marble surface.
        
        CRITICAL REQUIREMENT - PROPS: You MUST place these items randomly around the ${typeText} to create a cozy composition: ${randomProps}.
        The props must be visible but must NOT cover the design on the shirt.
        
        ZOOM: CLOSE-UP view. Frame the image tightly around the folded ${typeText}. The design must be the main focus.`;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        
        const modelPromise = generateImage(imagePart, modelPrompt).then(src => {
            api.recordUsage('mockup').catch(e => console.error(e));
            return { src, name: `model${nameSuffix}_mockup.png` };
        });
        
        const flatLayPromise = generateImage(imagePart, flatLayPrompt).then(src => {
            api.recordUsage('mockup').catch(e => console.error(e));
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
