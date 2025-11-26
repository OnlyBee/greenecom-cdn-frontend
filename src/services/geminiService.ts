
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
    // Select 2 to 3 items
    const count = Math.floor(Math.random() * 2) + 2; 
    return shuffled.slice(0, count).join(", "); 
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Analyze the apparel in the provided image. The design/artwork on the apparel must be preserved EXACTLY as is. 
    TASK: Change ONLY the fabric color of the apparel to '${color.name}'. 
    CONSTRAINT: Do NOT change the background. Do NOT change the design. Keep the lighting and shadows realistic.`;
    
    try {
        const src = await generateImage(imagePart, prompt);
        api.recordUsage('variation').catch(e => console.error("Tracking error:", e));
        return { src, name: `${color.name}_variation.png` };
    } catch (e) { throw e; }
  });
  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    
    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const basePrompt = `You are an expert product photographer. Analyze the provided image to extract the graphic design/artwork on the chest. You MUST preserve this design EXACTLY in the new image.`;
        const typeText = apparelType ? apparelType : "apparel";

        // MODEL PROMPT
        const modelPrompt = `${basePrompt}
        TASK: Generate a high-end lifestyle mockup of a model wearing a ${typeText}.
        MODEL: The model should look natural and professional.
        BACKGROUND: Use a blurred urban street or a cozy coffee shop background.
        ZOOM: EXTREME CLOSE-UP on the upper body. The shirt and design must fill 80% of the frame. The design must be sharp and legible.
        LIGHTING: Soft, natural sunlight.`;

        // FLAT LAY PROMPT - Stronger instruction for Props
        const randomProps = getRandomProps();
        const flatLayPrompt = `${basePrompt}
        TASK: Generate a creative Flat Lay composition of a ${typeText} on a wooden or marble texture surface.
        
        *** MANDATORY DECORATION INSTRUCTIONS ***
        You MUST place the following items around the shirt to create a scene: ${randomProps}.
        - The props must be clearly visible.
        - Arrange them artistically (e.g., shoes in corner, plant on side).
        - Do NOT cover the design on the shirt.
        
        VIEW: Top-down view.
        ZOOM: ZOOM IN tightly on the folded shirt so the design is the star of the image.`;
        
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
