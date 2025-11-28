export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface User {
  id: string;
  username: string;
  role: Role;
  assigned_folders?: { id: string; name: string }[];
}

export interface ImageFile {
  id: string;
  name: string;
  url: string;
  displayUrl: string;
  uploadedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  assigned_users?: { id: string; username: string }[];
}

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

export interface UsageStat {
  feature_name: string;
  usage_count: number;
  last_used_at: string;
}