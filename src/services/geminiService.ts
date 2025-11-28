import { GoogleGenAI } from "@google/genai";
import type { GeneratedImage, Color, ApparelType } from "../podTypes";
import { getApiKey } from '../utils/apiKey';

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
    if (!apiKey) throw new Error("API key not found.");

    const ai = new GoogleGenAI({ apiKey });
    
    // System instruction to ensure text fidelity
    const systemInstruction = `You are a professional product photographer. 
    Your Highest Priority: PRESERVE THE GRAPHIC DESIGN TEXT AND ARTWORK 100%. 
    Do not misspell, blur, or alter the design on the shirt.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview', // Update to Pro model
        contents: {
            parts: [imagePart, { text: prompt }],
        },
        config: {
            systemInstruction: systemInstruction,
            imageConfig: {
                aspectRatio: aspectRatio,
                imageSize: "1K"
            }
        }
    });

    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    
    // Check for text error response
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart && textPart.text) {
        throw new Error(`Model Error: ${textPart.text.substring(0, 100)}`);
    }

    throw new Error("No image was generated.");
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Professional product photography. Change the color of the T-shirt/apparel to '${color.name}'. 
    CRITICAL: Keep the printed graphic design and text EXACTLY the same as the original image. 
    Do not change the background. High resolution, realistic texture.`;
    const src = await generateImage(imagePart, prompt, "1:1");
    return { src, name: `${color.name}.png` };
  });
  return Promise.all(promises);
};

const FLAT_LAY_PROPS = [
    "jeans", "a flower pot", "a tree branch", "a plain scarf", "a plaid scarf", 
    "sneakers", "a wool cardigan", "a hat", "glasses", "a watch", "a gift box", 
    "a glass jar", "a cup", "a flower branch", "pampas grass"
];

const getRandomProps = (): string => {
    const shuffled = [...FLAT_LAY_PROPS].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 2) + 2; 
    const selected = shuffled.slice(0, count);
    if (selected.length === 0) return "";
    if (selected.length === 1) return selected[0];
    const last = selected.pop();
    return `${selected.join(", ")} and ${last}`;
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);

    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const basePrompt = `You are an expert product photographer. 
        TASK: Extract the GRAPHIC DESIGN/ARTWORK from the source image and apply it to a BRAND NEW apparel mockup.
        CRITICAL: 
        1. Do NOT use the original background. Create a completely NEW environment.
        2. Keep the graphic design exactly as is (colors, details), but apply realistic fabric folding and lighting to it.`;

        const typeStr = apparelType || "apparel";
        const apparelInstruction = `The item is a ${typeStr}.`;
        const randomProps = getRandomProps();

        // 1. Model Prompt: SPLIT-SCREEN COMPOSITE
        // Use 4:3 aspect ratio for side-by-side shots
        const modelPrompt = `${basePrompt} ${apparelInstruction}
        SCENE: A high-end lifestyle fashion shot.
        GENERATE: A **Split-Screen Composite Image** (Left Half + Right Half).
        
        LEFT PANEL:
        - Front view of a model wearing the ${typeStr}.
        - **ZOOM IN** on the torso/chest. The Design must be LARGE and CLEAR.
        
        RIGHT PANEL:
        - Back view of the SAME model wearing the ${typeStr}.
        - Shows the back of the shirt.
        
        Background: Clean, neutral, boutique style.`;
        
        // 2. Flat-lay Prompt: TWO ITEMS (Front & Back)
        const flatLayPrompt = `${basePrompt} ${apparelInstruction}
        SCENE: A professional flat-lay photography on a textured surface.
        GENERATE: An image containing **TWO SEPARATE ${typeStr}s** laid out together.
        
        ITEM 1 (Main):
        - Unfolded ${typeStr} showing the FRONT design.
        - Placed centrally or to the left.
        
        ITEM 2 (Secondary):
        - Folded ${typeStr} placed next to Item 1.
        - Shows the BACK or a folded detail.
        
        DECORATION: Stylize the scene with ${randomProps} placed naturally around.
        Ensure both items are visible and distinct.`;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';

        // Using 1:1 for Model to allow side-by-side room
        const modelPromise = generateImage(imagePart, modelPrompt, "1:1").then(src => ({ src, name: `model${nameSuffix}_double.png` }));
        // Using 1:1 for Flatlay to allow room for 2 items
        const flatLayPromise = generateImage(imagePart, flatLayPrompt, "1:1").then(src => ({ src, name: `flatlay${nameSuffix}_double.png` }));

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