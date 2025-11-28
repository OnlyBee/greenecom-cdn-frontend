export type Feature = 'variation' | 'mockup';

export interface GeneratedImage {
  src: string;
  name: string;
  apparelType?: string;
}

export interface Color {
  name: string;
  value: string;
  hex: string;
}

export type ApparelType = 'T-shirt' | 'Hoodie' | 'Sweater';