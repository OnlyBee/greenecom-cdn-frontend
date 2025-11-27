
import { GoogleGenAI } from "@google/genai";
import type { GeneratedImage, Color, ApparelType } from "../podTypes";
import { getApiKey } from '../utils/apiKey';
import { FLAT_LAY_PROPS } from '../podConstants';

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

const getRandomProps = (count: number = 2): string => {
  const shuffled = [...FLAT_LAY_PROPS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(", ");
};

const generateImage = async (imagePart: any, prompt: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key not found.");

    const ai = new GoogleGenAI({ apiKey });
    
    // System instruction to enforce text fidelity
    const systemInstruction = `You are an expert product photographer and graphic designer. 
    Your Highest Priority: PRESERVE THE GRAPHIC DESIGN AND TEXT ON THE APPAREL EXACTLY AS IT IS IN THE SOURCE IMAGE. 
    Do not blur, distort, or misspell the text. The design must be crisp, high-contrast, and fully legible.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [imagePart, { text: prompt }],
        },
        config: {
            systemInstruction: systemInstruction,
            // safetySettings: ... (optional)
        }
    });

    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    throw new Error("No image was generated.");
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Professional product photography. Change the color of the T-shirt/apparel to '${color.name}'. 
    CRITICAL: Keep the printed graphic design and text EXACTLY the same as the original image. 
    Do not change the background. High resolution, realistic texture.`;
    const src = await generateImage(imagePart, prompt);
    return { src, name: `${color.name}.png` };
  });
  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    
    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const typeStr = apparelType || "apparel";
        const randomDecor = getRandomProps(3); // Get 3 random props

        // 1. Model Prompt (2 People, Front & Back/Side, Zoomed In)
        const modelPrompt = `
            Create a photorealistic lifestyle mockup of **two models** wearing the same '${typeStr}'.
            
            Composition:
            - Model 1 (Front): Facing forward, occupying a large portion of the frame. The graphic design on the chest must be HUGE, CRISP, and perfectly readable. 
            - Model 2 (Back/Side/Overlap): Standing slightly behind or beside, showing the back view or a side angle of the shirt.
            - Overlap the models slightly to create a dynamic composition.
            - Crop closely to the torsos to maximize the visibility of the '${typeStr}' design. Do not focus on faces.
            
            Fidelity:
            - The graphic design/text from the source image must be preserved 100% accurately. No typos. No blurring.
            - Lighting: Professional studio or soft daylight.
        `;

        // 2. Flat Lay Prompt (1 Spread, 1 Folded, Random Props)
        const flatLayPrompt = `
            Create a professional flat-lay photography composition of the '${typeStr}' on a neutral texture background.
            
            Composition:
            - Item 1 (Main): The '${typeStr}' is spread out flat and center. The graphic design must be the main focus, large, and perfectly legible.
            - Item 2 (Folded): A second '${typeStr}' is neatly folded beside it, showing the fabric texture.
            - Decor: Randomly place these items around to create a lifestyle vibe, but do not obscure the design: ${randomDecor}.
            
            Fidelity:
            - The text and artwork must be identical to the source image. Sharp edges, correct spelling.
        `;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        const modelPromise = generateImage(imagePart, modelPrompt).then(src => ({ src, name: `model${nameSuffix}_mockup.png` }));
        const flatLayPromise = generateImage(imagePart, flatLayPrompt).then(src => ({ src, name: `flatlay${nameSuffix}_mockup.png` }));
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
