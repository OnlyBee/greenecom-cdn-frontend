
import { GoogleGenAI } from "@google/genai";
import type { GeneratedImage, Color, ApparelType } from "../podTypes";
import { getApiKey } from '../utils/apiKey';
import { MOCKUP_PROPS } from '../podConstants';
import { api } from './api'; // Import api to call stats

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
        contents: {
            parts: [imagePart, { text: prompt }],
        },
    });

    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    throw new Error("No image was generated.");
};

// Helper to get random props
const getRandomProps = (): string => {
    // Shuffle array
    const shuffled = [...MOCKUP_PROPS].sort(() => 0.5 - Math.random());
    // Get 2 to 3 items
    const count = Math.floor(Math.random() * 2) + 2; // 2 or 3
    const selected = shuffled.slice(0, count);
    return selected.join(", ");
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Analyze the apparel in the provided image. The design on the apparel must be preserved perfectly. The task is to change ONLY the color of the apparel itself to '${color.name}'. Do not alter the background, any other objects, or the design printed on the apparel. The output must be an image.`;
    try {
        const src = await generateImage(imagePart, prompt);
        // Track success
        api.recordUsage('variation').catch(e => console.error("Stats error", e));
        return { src, name: `${color.name}.png` };
    } catch (e) {
        throw e; // Propagate error to UI
    }
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
        IMPORTANT: This must be a CLOSE-UP shot focusing strictly on the chest/torso area where the graphic design is located. 
        Zoom in significantly so the design details are perfectly visible, sharp, and readable. 
        Do not include the full body, focus on the upper body and the design. Neutral background.`;

        // FLAT LAY PROMPT (Props + Close-up focus)
        const randomProps = getRandomProps();
        const flatLayPrompt = `${basePrompt} ${apparelTypeInstruction} Create a new, photorealistic flat-lay mockup image.
        Aesthetic decor: Randomly place these items around the apparel frame to make it lively: ${randomProps}.
        IMPORTANT: Ensure these props DO NOT cover or obscure the graphic design on the apparel.
        ZOOM LEVEL: Close-up. Frame the image tightly around the apparel's design area so the artwork is the main focus and very detailed.`;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        
        const modelPromise = generateImage(imagePart, modelPrompt).then(src => {
            api.recordUsage('mockup').catch(e => console.error("Stats error", e));
            return { src, name: `model${nameSuffix}_mockup.png` };
        });
        
        const flatLayPromise = generateImage(imagePart, flatLayPrompt).then(src => {
            api.recordUsage('mockup').catch(e => console.error("Stats error", e));
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
