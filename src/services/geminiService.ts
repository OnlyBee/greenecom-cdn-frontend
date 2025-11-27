
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

const getRandomProps = (count: number = 3): string => {
  const shuffled = [...FLAT_LAY_PROPS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(", ");
};

const generateImage = async (imagePart: any, prompt: string, isCollage: boolean = false): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key not found.");

    const ai = new GoogleGenAI({ apiKey });
    
    // System instruction to enforce text fidelity and style
    const systemInstruction = `You are an expert product photographer for a high-end Etsy Print-on-Demand boutique.
    
    CORE RULES:
    1. **TEXT FIDELITY IS PARAMOUNT**: The graphic design and text on the apparel must be preserved 100% pixel-perfect. Do not blur, distort, misspell, or hallucinate new text.
    2. **STYLE**: Use natural window lighting, soft shadows, and high-resolution textures. Avoid "AI-looking" glossy skin.
    3. **COMPOSITION**: strictly follow the layout instructions.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [imagePart, { text: prompt }],
        },
        config: {
            systemInstruction: systemInstruction,
            imageConfig: {
                imageSize: "1K",
                aspectRatio: isCollage ? "4:3" : "1:1" // Use 4:3 for collages/flatlays to give more room
            }
        }
    });

    // Iterate through all parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                 return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        
        // If no image found, check for text (error message from model)
        const textPart = parts.find(p => p.text);
        if (textPart) {
            console.warn("Model returned text instead of image:", textPart.text);
            // Throw a more descriptive error if possible, but keep it user friendly
            throw new Error(`Model refused to generate image. Reason: ${textPart.text.substring(0, 50)}...`);
        }
    }

    throw new Error("No image was generated. Please try again.");
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Professional product photography. Change the color of the T-shirt/apparel to '${color.name}'. 
    CRITICAL: Keep the printed graphic design and text EXACTLY the same as the original image. 
    Do not change the background. High resolution, realistic texture.`;
    const src = await generateImage(imagePart, prompt, false);
    return { src, name: `${color.name}.png` };
  });
  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    
    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const typeStr = apparelType || "apparel";
        const randomDecor = getRandomProps(3); // Get 3 random props

        // 1. Model Prompt: SPLIT-SCREEN COLLAGE (Giống hình mẫu user cung cấp)
        const modelPrompt = `
            Create a professional **SPLIT-SCREEN COLLAGE** image (two panels stitched together side-by-side).
            
            **LEFT PANEL (Front View):**
            - A photorealistic, close-up shot of a model wearing the '${typeStr}'.
            - **CROP:** Focus tightly on the torso/chest area. The graphic design must be HUGE, CENTERED, and 100% READABLE.
            - Do not show the model's full legs. Focus on the shirt.
            
            **RIGHT PANEL (Back View):**
            - A photorealistic shot of the model wearing the same '${typeStr}' from the back.
            - If the original design is on the front, show the plain back. If the design is on the back, show the design clearly.
            
            **Overall Vibe:**
            - "Boutique" aesthetic. Natural lighting. Neutral background (white wall or soft studio).
            - The final image must look like a single 2-up collage used for online store listings.
        `;

        // 2. Flat Lay Prompt: ETSY STYLE (1 Trải, 1 Gấp, Decor)
        const flatLayPrompt = `
            Create a stylish **Etsy-style Flat Lay** product photography composition for the '${typeStr}'.
            
            **Layout:**
            - **Main Item:** The '${typeStr}' is laid out flat in the center, perfectly smooth. The graphic design text must be sharp and legible.
            - **Secondary Item:** A second '${typeStr}' (same color) is folded neatly on the side or corner.
            - **Background:** A textured surface (white wood planks, concrete, or wrinkled linen sheet).
            - **Decor:** Artistically arrange these specific props around the shirt to frame it: ${randomDecor}.
            
            **Lighting:**
            - Soft, diffused daylight casting gentle shadows. No harsh flash.
        `;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        const modelPromise = generateImage(imagePart, modelPrompt, true).then(src => ({ src, name: `model${nameSuffix}_collage.png` }));
        const flatLayPromise = generateImage(imagePart, flatLayPrompt, true).then(src => ({ src, name: `flatlay${nameSuffix}_etsy.png` }));
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
