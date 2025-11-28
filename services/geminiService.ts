
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

export const generateVariations = async (file: File, selectedColors: Color[]): Promise<GeneratedImage[]> => {
  const imagePart = await fileToGenerativePart(file);
  const promises = selectedColors.map(async (color) => {
    const prompt = `Analyze the apparel in the provided image. The design on the apparel must be preserved perfectly. The task is to change ONLY the color of the apparel itself to '${color.name}'. Do not alter the background, any other objects, or the design printed on the apparel. The output must be an image.`;
    const src = await generateImage(imagePart, prompt);
    return { src, name: `${color.name}.png` };
  });
  return Promise.all(promises);
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[], isDoubleSided: boolean = false): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);
    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const basePrompt = `Analyze the apparel in the provided image to identify its color and the graphic design printed on it. These elements must be preserved perfectly.`;
        const apparelTypeInstruction = apparelType
            ? `The new mockup must feature a '${apparelType}'.`
            : `The new mockup must feature the same type of apparel.`;
        
        const doubleSidedInstruction = isDoubleSided ? "Include both front and back views if possible." : "";

        const modelPrompt = `${basePrompt} ${apparelTypeInstruction} ${doubleSidedInstruction} Create a new, photorealistic mockup image of a person wearing this apparel. Neutral background.`;
        const flatLayPrompt = `${basePrompt} ${apparelTypeInstruction} ${doubleSidedInstruction} Create a new, photorealistic flat-lay mockup image.`;
        
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
