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
    const systemInstruction = `You are a professional product photographer and image editor.
    CRITICAL INSTRUCTION: TEXT FIDELITY IS PARAMOUNT.
    1. When applying a graphic design to a new shirt, you MUST preserve the original text spelling, font, and style EXACTLY.
    2. Do NOT redraw the text. Treat the design as a "texture" that is mapped onto the 3D surface of the cloth.
    3. Do NOT hallucinate new text or change the wording.
    4. If the text is small, ensure it remains sharp and readable.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [imagePart, { text: prompt }],
        },
        config: {
            systemInstruction: systemInstruction,
            imageConfig: {
                aspectRatio: "1:1", // Strict 1:1 as requested
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
    const prompt = `Change the color of the apparel to '${color.name}'. 
    CRITICAL: The printed graphic design and text must remain IDENTICAL to the source image. 
    Do not alter the font, spelling, or position of the design.
    Keep the original background and lighting.`;
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
        TASK: Take the GRAPHIC DESIGN/PRINT from the source image and composite it onto a NEW ${apparelType || "apparel"} mockup.
        
        STRICT RULES FOR TEXT:
        - The text in the design MUST remain legible and spelled correctly.
        - Treat the design as a static asset being projected onto the cloth.
        - Do NOT try to "improve" the text. Copy it exactly.
        
        ENVIRONMENTS:
        - Create a completely NEW, photorealistic environment.
        - Realistic fabric folds, lighting, and shadows must apply OVER the design.`;

        const typeStr = apparelType || "apparel";
        const apparelInstruction = `The item is a ${typeStr}.`;

        // Get random props for this specific generation
        const randomProps = getRandomProps();

        let modelPrompt = "";
        let flatLayPrompt = "";
        
        // Forced 1:1 aspect ratio for all modes as requested
        const aspectRatio = "1:1";

        if (isDoubleSided) {
             // 1. Model Prompt: Front & Back View (Composited)
            modelPrompt = `${basePrompt} ${apparelInstruction}
            SCENE: Split-screen or Composite Lifestyle Shot.
            SUBJECT: Show the SAME model in two poses side-by-side (or composited creatively).
            - Left/Front: Model facing forward showing the Front Design.
            - Right/Back: Model turning away showing the Back.
            CONSTRAINT: Ensure the graphic design text is perfectly readable.
            Lighting: Bright, natural, high-key lighting.`;
            
            // 2. Flat-lay Prompt: Front & Back View (Laid out)
            flatLayPrompt = `${basePrompt} ${apparelInstruction}
            SCENE: Professional Flat Lay on a neutral texture (wood/concrete).
            SUBJECT: Two items arranged aesthetically.
            1. One ${typeStr} unfolded showing the Front.
            2. One ${typeStr} folded or placed adjacent showing the Back.
            DECORATION: Add minimal props: ${randomProps}.
            CONSTRAINT: The text on the design must be sharp.`;
        } else {
            // 1. Model Prompt: Single View
            modelPrompt = `${basePrompt} ${apparelInstruction}
            SCENE: High-end Lifestyle Portrait.
            SUBJECT: A model wearing the ${typeStr}, facing forward.
            FRAMING: Medium shot (waist up). Zoom in enough to make the text design clear and readable.
            CONSTRAINT: ONE person only. Front view only.
            Lighting: Soft studio lighting.`;

            // 2. Flat-lay Prompt: Single View
            flatLayPrompt = `${basePrompt} ${apparelInstruction}
            SCENE: Clean Minimalist Flat Lay.
            SUBJECT: A single ${typeStr} placed in the center.
            ARRANGEMENT: Neatly folded or flat.
            DECORATION: ${randomProps} placed around the edges.
            CONSTRAINT: ONE item only. Front view only.`;
        }
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        const modeSuffix = isDoubleSided ? '_double_sided' : '';

        const modelPromise = generateImage(apiKey, imagePart, modelPrompt, aspectRatio).then(src => ({ src, name: `model${nameSuffix}${modeSuffix}.png` }));
        const flatLayPromise = generateImage(apiKey, imagePart, flatLayPrompt, aspectRatio).then(src => ({ src, name: `flatlay${nameSuffix}${modeSuffix}.png` }));

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