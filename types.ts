
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
