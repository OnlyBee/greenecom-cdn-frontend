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
    if (!apiKey) throw new Error("API key not found. Please contact an admin.");

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
    });

    const candidates = response.candidates;
    // Sửa lỗi 'Object is possibly undefined' bằng cách kiểm tra kỹ
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
        for (const part of candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    // Nếu không có ảnh, thử tìm text để báo lỗi chi tiết hơn
    const textResponse = response.text;
    if (textResponse) {
        throw new Error(`AI returned text instead of an image: "${textResponse.substring(0, 100)}..."`);
    }
    
    throw new Error("No image was generated. The AI might have refused the request.");
};

const getRandomProps = (): string => {
    const shuffled = [...MOCKUP_PROPS].sort(() => 0.5 - Math.random());
    // Chọn 2 hoặc 3 vật phẩm
    const count = Math.floor(Math.random() * 2) + 2; 
    const selected = shuffled.slice(0, count); 
    return selected.join(", "); 
};

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `
    TASK: Change the color of the apparel item to '${color.name}'.
    STRICT RULES:
    1. The graphic design printed on the apparel MUST be preserved perfectly.
    2. The background, lighting, and any other objects MUST NOT be altered.
    3. The output MUST be a single, high-quality image. NO COLLAGES.
    `;
    
    try {
        const src = await generateImage(imagePart, prompt);
        api.recordUsage('variation').catch(console.warn);
        return { src, name: `${color.name.replace(/\s+/g, '_')}_variation.png` };
    } catch (e) { 
        console.error(`Failed to generate variation for ${color.name}:`, e);
        throw e; 
    }
  });
  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    
    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const typeText = apparelType || "T-Shirt"; // Mặc định là T-shirt nếu không chọn
        const randomProps = getRandomProps();
        
        // PROMPT MẠNH MẼ HƠN
        const modelPrompt = `
        ROLE: Professional Fashion Photographer.
        TASK: Create a photorealistic lifestyle mockup of a person wearing a ${typeText}.
        
        CRITICAL INSTRUCTIONS:
        1.  **IGNORE ORIGINAL BACKGROUND**: Create a completely new, clean, blurred background (e.g., urban street, modern cafe, or minimalist studio).
        2.  **APPLY DESIGN**: Extract the graphic design from the source image and place it realistically on the chest of the new ${typeText}.
        3.  **VIEW**: Use an **EXTREME CLOSE-UP** shot, framed from the waist up. The graphic design MUST be the main focus, large and clear.
        4.  **FORMAT**: SINGLE IMAGE ONLY. NO COLLAGES.
        `;

        const flatLayPrompt = `
        ROLE: Professional Product Photographer.
        TASK: Create a professional flat lay mockup of a single, folded ${typeText}.

        CRITICAL INSTRUCTIONS:
        1.  **BACKGROUND**: The apparel must be placed on a clean, textured surface like a light wooden table or white marble. **IGNORE THE ORIGINAL BACKGROUND**.
        2.  **MANDATORY PROPS**: You MUST include these 3 items in the scene, arranged naturally around the apparel: **${randomProps}**. The props must not cover the main graphic design.
        3.  **APPLY DESIGN**: Place the graphic design from the source image clearly on the folded ${typeText}.
        4.  **VIEW**: Use a **TOP-DOWN, EXTREME CLOSE-UP** view. The graphic design must be the main focus and highly detailed.
        5.  **FORMAT**: SINGLE IMAGE ONLY. NO COLLAGES.
        `;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';
        
        const modelPromise = generateImage(imagePart, modelPrompt).then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `model${nameSuffix}.png` };
        });
        
        const flatLayPromise = generateImage(imagePart, flatLayPrompt).then(src => {
            api.recordUsage('mockup').catch(console.warn);
            return { src, name: `flatlay${nameSuffix}_with_props.png` };
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
