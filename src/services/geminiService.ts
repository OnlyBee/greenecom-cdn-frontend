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
    return shuffled.slice(0, 3).join(", "); // Take 3 items
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Analyze the apparel in the provided image. The design on the apparel must be preserved perfectly. The task is to change ONLY the color of the apparel itself to '${color.name}'. Do not alter the background, any other objects, or the design printed on the apparel. The output must be an image.`;
    try {
        const src = await generateImage(imagePart, prompt);
        api.recordUsage('variation').catch(e => console.error(e));
        return { src, name: `${color.name}.png` };
    } catch (e) { throw e; }
  });
  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    
    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const basePrompt = `Analyze the apparel in the provided image to identify its color and the graphic design printed on it. These elements must be preserved perfectly.`;
        const apparelTypeInstruction = apparelType
            ? `The new mockup must feature a '${apparelType}'.`
            : `The new mockup must feature the same type of apparel.`;

        // MODEL PROMPT (Close-up focus)
        const modelPrompt = `${basePrompt} ${apparelTypeInstruction} Create a new, photorealistic mockup image of a person wearing this apparel.
        ZOOM LEVEL: Extreme Close-up. Focus tightly on the chest/torso area where the design is. The design must be the main subject, large and clear. Do not show the full body. Neutral background.`;

        // FLAT LAY PROMPT (Random Props + Close-up)
        const randomProps = getRandomProps();
        const flatLayPrompt = `${basePrompt} ${apparelTypeInstruction} Create a new, photorealistic flat-lay mockup image.
        DECOR: Place these items randomly around the apparel to create a lively scene: ${randomProps}.
        ZOOM LEVEL: Extreme Close-up. Frame the image very tightly around the apparel's design area. The design must be distinct and sharp. Ensure props do not cover the design.`;
        
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