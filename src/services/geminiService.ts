
import { GoogleGenAI, Modality, Part } from "@google/genai";
import type { GeneratedImage, Color, ApparelType } from "../types";
import { getApiKey } from '../utils/apiKey';

const fileToGenerativePart = async (file: File): Promise<Part> => {
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

const generateImage = async (imagePart: Part, prompt: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API key not found. Please set your API key.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [imagePart, { text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
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

const FLAT_LAY_PROPS = [
    "jeans", // quần jean
    "a flower pot", // chậu hoa
    "a tree branch", // nhành cây
    "a plain scarf", // khăn trơn
    "a plaid scarf", // khăn caro
    "sneakers", // giày sneaker
    "a wool cardigan", // áo khoác len
    "a hat", // mũ
    "glasses", // mắc kính
    "a watch", // đồng hồ
    "a gift box", // hộp quà
    "a glass jar", // lọ thủy tinh
    "a cup", // cốc
    "a flower branch", // nhành hoa
    "pampas grass" // bông cỏ lau
];

const getRandomProps = (): string => {
    // Shuffle array
    const shuffled = [...FLAT_LAY_PROPS].sort(() => 0.5 - Math.random());
    // Select 2 to 3 items
    const count = Math.floor(Math.random() * 2) + 2; 
    const selected = shuffled.slice(0, count);
    
    // Format natural language list (a, b, and c)
    if (selected.length === 0) return "";
    if (selected.length === 1) return selected[0];
    const last = selected.pop();
    return `${selected.join(", ")} and ${last}`;
};

export const remakeMockups = async (file: File, apparelTypes: ApparelType[]): Promise<GeneratedImage[]> => {
    const imagePart = await fileToGenerativePart(file);

    const createMockupPromises = (apparelType: ApparelType | null): Promise<GeneratedImage>[] => {
        const basePrompt = `Analyze the apparel in the provided image to identify its color and the graphic design printed on it. These elements must be preserved perfectly.`;

        const apparelTypeInstruction = apparelType
            ? `The new mockup must feature a '${apparelType}'.`
            : `The new mockup must feature the same type of apparel as in the original image (e.g., t-shirt, sweater, hoodie).`;

        const modelPrompt = `${basePrompt} ${apparelTypeInstruction} Create a new, photorealistic mockup image of a person wearing this apparel. The background should be clean and neutral, suitable for an e-commerce product listing.`;
        
        // Get random props for this specific generation
        const randomProps = getRandomProps();
        const flatLayPrompt = `${basePrompt} ${apparelTypeInstruction} Create a new, photorealistic flat-lay mockup image. The apparel should be neatly arranged on a complementary surface (like wood or linen). Add a few tasteful props like ${randomProps}. The overall aesthetic should be stylish and professional.`;
        
        const nameSuffix = apparelType ? `_${apparelType.toLowerCase().replace(/\s/g, '_')}` : '';

        const modelPromise = generateImage(imagePart, modelPrompt).then(src => ({ src, name: `model${nameSuffix}_mockup.png` }));
        const flatLayPromise = generateImage(imagePart, flatLayPrompt).then(src => ({ src, name: `flatlay${nameSuffix}_mockup.png` }));

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
