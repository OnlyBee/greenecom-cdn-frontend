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

    const candidates = response.candidates;
    // Fix TS2532: Use optional chaining to safely access content and parts
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
    const count = 3; // Force 3 items
    const selected = shuffled.slice(0, count);
    if (selected.length === 0) return "flowers and jeans";
    return selected.join(", ");
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  
  const promises = selectedColors.map(async (color) => {
    const prompt = `Task: Recolor the apparel.
    Target Color: ${color.name} (${color.hex}).
    Instructions: 
    1. Identify the apparel item in the image.
    2. Change ONLY the fabric color to exactly ${color.name}.
    3. KEEP the original design/artwork 100% intact.
    4. KEEP the original background and lighting.
    5. High realism, 4k quality.`;
    
    try {
        const src = await generateImage(imagePart, prompt, "1:1");
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
        const typeStr = apparelType || "T-shirt";
        const randomProps = getRandomProps();

        // 1. Model Prompt
        const modelPrompt = `
        ROLE: Professional Fashion Photographer.
        TASK: Create a LIFESTYLE MODEL MOCKUP.
        INPUT: Use the graphic design from the source image.
        
        INSTRUCTIONS:
        1. GENERATE A NEW IMAGE of a real human model wearing a ${typeStr}.
        2. PLACE the original graphic design onto the chest of the ${typeStr}.
        3. IGNORE the original background. Create a NEW blurred urban street or cozy cafe background.
        4. VIEW: Front view, waist-up, close-up zoom on the apparel.
        5. LIGHTING: Natural sunlight, soft shadows.
        6. QUALITY: Photorealistic, 8k, highly detailed texture.
        `;
        
        // 2. Flat-lay Prompt - Strong enforcement of props
        const flatLayPrompt = `
        ROLE: Expert Product Photographer.
        TASK: Create a CREATIVE FLAT LAY COMPOSITION.
        
        MANDATORY ELEMENTS:
        1. OBJECT: A folded ${typeStr} placed in the center.
        2. DESIGN: Apply the source graphic design onto the ${typeStr} clearly.
        3. BACKGROUND: A textured wooden table or marble surface.
        4. PROPS (MUST INCLUDE): Scatter these around the shirt: ${randomProps}.
        
        COMPOSITION RULES:
        - View: Top-down (Bird's eye view).
        - Zoom: CLOSE-UP. The shirt should occupy 80% of the frame.
        - Lighting: Soft studio lighting, realistic shadows.
        - NO collage, NO split screen. Single cohesive image.
        `;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';

        const modelPromise = generateImage(imagePart, modelPrompt, "1:1").then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `model${nameSuffix}.png` };
        });
        const flatLayPromise = generateImage(imagePart, flatLayPrompt, "1:1").then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `flatlay${nameSuffix}_with_props.png` };
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