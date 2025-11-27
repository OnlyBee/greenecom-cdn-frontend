import { GoogleGenAI, Modality } from "@google/genai";
import type { GeneratedImage, Color, ApparelType } from "../podTypes";
import { getApiKey } from '../utils/apiKey';
import { FLAT_LAY_PROPS } from '../podConstants';
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

const generateImage = async (imagePart: any, prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API key not found. Please contact Admin.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [imagePart, { text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: {
                aspectRatio: aspectRatio,
            }
        },
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
    
    throw new Error("No image was generated from Gemini.");
};

const getRandomProps = (): string => {
    const shuffled = [...FLAT_LAY_PROPS].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 2) + 2; // Select 2 to 3 items
    const selected = shuffled.slice(0, count);
    
    if (selected.length === 0) return "";
    if (selected.length === 1) return selected[0];
    const last = selected.pop();
    return `${selected.join(", ")} and ${last}`;
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  
  const promises = selectedColors.map(async (color) => {
    const prompt = `Analyze the apparel in the provided image. The design on the apparel must be preserved perfectly. The task is to change ONLY the color of the apparel itself to '${color.name}'. Do not alter the background, any other objects, or the design printed on the apparel. The output must be an image.`;
    
    try {
        const src = await generateImage(imagePart, prompt, "1:1");
        // Track usage
        api.recordUsage('variation').catch(e => console.warn('Tracking failed', e));
        return { src, name: `${color.name}.png` };
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
        const basePrompt = `You are an expert product photographer. 
        TASK: Extract the GRAPHIC DESIGN/ARTWORK from the source image and apply it to a BRAND NEW apparel mockup.
        CRITICAL: 
        1. Do NOT use the original background. Create a completely NEW environment.
        2. Do NOT use the original person/model. Use a NEW model or NEW pose.
        3. Keep the graphic design exactly as is (colors, details), but realistic lighting must apply to it.`;

        const typeStr = apparelType || "apparel";
        const apparelInstruction = `The item is a ${typeStr}.`;
        const randomProps = getRandomProps();

        // 1. Model Prompt
        const modelPrompt = `${basePrompt} ${apparelInstruction}
        SCENE: A lifestyle fashion shot.
        SUBJECT: Generate a composite image showing TWO angles of a model wearing this ${typeStr}.
        - Figure A (Front): A model facing forward, clearly displaying the design on the FRONT.
        - Figure B (Back): The SAME model standing turned around (back to camera) to show the BACK of the item.
        COMPOSITION: 
        - The two figures should stand close together, slightly overlapping (e.g., back-to-back or one slightly behind the other).
        - Zoom in to frame them from mid-thigh up.
        - FOCUS: The Graphic Design must be large, readable, and the center of attention.
        - Lighting: Professional studio or natural outdoor lighting.`;
        
        // 2. Flat-lay Prompt
        const flatLayPrompt = `${basePrompt} ${apparelInstruction}
        SCENE: A professional flat-lay photography on a specific surface (e.g., wooden table, concrete, or marble).
        SUBJECT: Arrange TWO ${typeStr}s on the surface.
        - Item 1: Unfolded or neatly arranged showing the FRONT design.
        - Item 2: Folded or laid next to Item 1, showing the BACK of the apparel.
        COMPOSITION:
        - Place them close together to fill the frame.
        - Do not zoom out too far; crop tightly around the shirts so the Design is very clear and detailed.
        DECORATION: Stylize the scene with ${randomProps} placed naturally around (but not covering the design).`;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';

        const modelPromise = generateImage(imagePart, modelPrompt, "1:1").then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `model${nameSuffix}_double_sided.png` };
        });
        const flatLayPromise = generateImage(imagePart, flatLayPrompt, "1:1").then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `flatlay${nameSuffix}_double_sided.png` };
        });

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