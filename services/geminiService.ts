
import { GoogleGenAI } from "@google/genai";
import type { GeneratedImage, Color, ApparelType } from "../podTypes";

// Helper to encode file to base64
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

const generateImage = async (apiKey: string, imagePart: any, prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
    if (!apiKey) throw new Error("API key is missing.");

    const ai = new GoogleGenAI({ apiKey });
    
    // System instruction to ensure text fidelity
    const systemInstruction = `You are a professional product photographer. 
    Your Highest Priority: PRESERVE THE GRAPHIC DESIGN TEXT AND ARTWORK 100%. 
    Do not misspell, blur, or alter the design on the shirt.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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

export const generateVariations = async (apiKey: string, file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Professional product photography. Change the color of the T-shirt/apparel to '${color.name}'. 
    CRITICAL: Keep the printed graphic design and text EXACTLY the same as the original image. 
    Do not change the background. High resolution, realistic texture.`;
    const src = await generateImage(apiKey, imagePart, prompt, "1:1");
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

export const remakeMockups = async (apiKey: string, file: File, apparelTypes: ApparelType[], isDoubleSided: boolean = false): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);

    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        // Core instruction: Extract design, discard old scene.
        const basePrompt = `You are an expert product photographer. 
        TASK: Extract the GRAPHIC DESIGN/ARTWORK from the source image and apply it to a BRAND NEW apparel mockup.
        CRITICAL: 
        1. Do NOT use the original background. Create a completely NEW environment.
        2. Do NOT use the original person/model. Use a NEW model or NEW pose.
        3. Keep the graphic design exactly as is (colors, details), but realistic lighting must apply to it.`;

        const typeStr = apparelType || "apparel";
        const apparelInstruction = `The item is a ${typeStr}.`;

        // Get random props for this specific generation
        const randomProps = getRandomProps();

        let modelPrompt = "";
        let flatLayPrompt = "";
        // Use 4:3 for split screen, 1:1 for single
        const aspectRatio = isDoubleSided ? "4:3" : "1:1"; 

        if (isDoubleSided) {
             // 1. Model Prompt: Front & Back View (Composited)
            modelPrompt = `${basePrompt} ${apparelInstruction}
            SCENE: A lifestyle fashion shot.
            SUBJECT: Generate a composite image showing TWO angles of a model wearing this ${typeStr}.
            - Figure A (Front): A model facing forward, clearly displaying the design on the FRONT.
            - Figure B (Back): The SAME model standing turned around (back to camera) to show the BACK of the item.
            COMPOSITION: 
            - The two figures should stand close together, slightly overlapping (e.g., back-to-back or one slightly behind the other).
            - Zoom in to frame them from mid-thigh up.
            - FOCUS: The Graphic Design must be large, readable, and the center of attention.
            - Lighting: Professional studio or natural outdoor lighting.`;
            
            // 2. Flat-lay Prompt: Front & Back View (Laid out)
            flatLayPrompt = `${basePrompt} ${apparelInstruction}
            SCENE: A professional flat-lay photography on a specific surface (e.g., wooden table, concrete, or marble).
            SUBJECT: Arrange TWO ${typeStr}s on the surface.
            - Item 1: Unfolded or neatly arranged showing the FRONT design.
            - Item 2: Folded or laid next to Item 1, showing the BACK of the apparel.
            COMPOSITION:
            - Place them close together to fill the frame.
            - Do not zoom out too far; crop tightly around the shirts so the Design is very clear and detailed.
            DECORATION: Stylize the scene with ${randomProps} placed naturally around (but not covering the design).`;
        } else {
            // 1. Model Prompt: Single View (STRICTLY ONE)
            // Reinforced constraints to prevent back view or multiple people
            modelPrompt = `${basePrompt} ${apparelInstruction}
            SCENE: A high-quality lifestyle fashion shot.
            SUBJECT: A SINGLE model wearing this ${typeStr}.
            CONSTRAINT: 
            - There must be ONLY ONE person in the image.
            - VIEW: Frontal view ONLY. The model is facing the camera.
            - NO mirrors, NO split screens, NO back views.
            POSE: The model is relaxed, chest visible clearly.
            COMPOSITION:
            - Medium shot (waist up).
            - The Graphic Design must be the absolute hero of the image. Clear, sharp, and well-lit.
            - Lighting: Soft, natural daylight.`;

            // 2. Flat-lay Prompt: Single View (STRICTLY ONE)
            // Reinforced constraints to prevent second folded shirt
            flatLayPrompt = `${basePrompt} ${apparelInstruction}
            SCENE: A professional flat-lay photography.
            SUBJECT: EXACTLY ONE ${typeStr} (Solo object).
            ARRANGEMENT: 
            - The item is placed in the center.
            - It is either unfolded OR neatly folded (but only ONE item total).
            - VIEW: Front view ONLY.
            - FORBIDDEN: Do NOT place a second shirt. Do NOT place a folded version next to it.
            DECORATION: Stylize the scene with ${randomProps} placed artistically around the item.
            FOCUS: Ensure the design is not covered by props.`;
        }
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        const modeSuffix = isDoubleSided ? '_double_sided' : '';

        const modelPromise = generateImage(apiKey, imagePart, modelPrompt, aspectRatio).then(src => ({ src, name: `model${nameSuffix}${modeSuffix}.png` }));
        const flatLayPromise = generateImage(apiKey, imagePart, flatLayPrompt, aspectRatio).then(src => ({ src, name: `flatlay${nameSuffix}${modeSuffix}.png` }));

        return [modelPromise, flatLayPromise];
    };

    let allPromises: Promise<GeneratedImage>[] = [];

    if (apparelTypes.length === 0) {
        // Default behavior: auto-detect if no types are selected
        allPromises = createMockupPromises(null);
    } else {
        // Generate for each selected type
        apparelTypes.forEach(type => {
            allPromises.push(...createMockupPromises(type));
        });
    }

    return Promise.all(allPromises);
};
