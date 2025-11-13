
export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface User {
  id: string;
  username: string;
  role: Role;
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
  assignedUserIds: string[];
}