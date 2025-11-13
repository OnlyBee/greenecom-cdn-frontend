import { Role, type User, type Folder, type ImageFile } from '../types';

// --- Mock Database ---

const DB_KEY = 'greenecom_cdn_db';

interface Database {
  users: User[];
  folders: Folder[];
  images: Record<string, ImageFile[]>; // folderId -> images
}

const getInitialData = (): Database => {
  const adminId = 'user-1';
  const memberId = 'user-2';

  const folder1Id = 'folder-1';
  const folder2Id = 'folder-2';

  return {
    users: [
      { id: adminId, username: 'admin', role: Role.ADMIN }, // password: Rinnguyen@123
      { id: memberId, username: 'member', role: Role.MEMBER }, // password: member
    ],
    folders: [
      { id: folder1Id, name: 'Marketing Materials', assignedUserIds: [memberId] },
      { id: folder2Id, name: 'Product Shots', assignedUserIds: [] },
    ],
    images: {
      [folder1Id]: [
        { id: 'img-1', name: 'banner.jpg', url: 'https://cdn.greenecom.net/marketing-materials/banner.jpg', displayUrl: 'https://picsum.photos/seed/picsum/400/300', uploadedAt: new Date() },
        { id: 'img-2', name: 'logo.png', url: 'https://cdn.greenecom.net/marketing-materials/logo.png', displayUrl: 'https://picsum.photos/seed/rdm/400/300', uploadedAt: new Date() },
      ],
      [folder2Id]: [],
    },
  };
};

let db: Database;

const loadDb = () => {
  try {
    const storedDb = localStorage.getItem(DB_KEY);
    if (storedDb) {
      db = JSON.parse(storedDb);
      // Revive dates and ensure displayUrl exists for older data
      Object.values(db.images).flat().forEach(img => {
        if (img.uploadedAt) {
            img.uploadedAt = new Date(img.uploadedAt);
        }
        if (!img.displayUrl) {
            img.displayUrl = img.url;
        }
      });
    } else {
      db = getInitialData();
      saveDb();
    }
  } catch (error) {
    console.error("Failed to load DB from localStorage", error);
    db = getInitialData();
  }
};

const saveDb = () => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

loadDb();

// --- API Functions ---

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}


export const api = {
  async login(username: string, password: string): Promise<User> {
    await delay(500);
    const user = db.users.find(u => u.username === username);
    if (user) {
        // Special password for admin, simple check for others
        if (user.role === Role.ADMIN && password === 'Rinnguyen@123') {
            return user;
        }
        if (user.role === Role.MEMBER && password === user.username) {
            return user;
        }
    }
    throw new Error('Invalid credentials');
  },

  async getAllUsers(): Promise<User[]> {
    await delay(300);
    return [...db.users];
  },

  async getAllFolders(): Promise<Folder[]> {
    await delay(300);
    return [...db.folders];
  },
  
  async getFoldersForUser(userId: string): Promise<Folder[]> {
    await delay(300);
    return db.folders.filter(f => f.assignedUserIds.includes(userId));
  },

  async getImagesInFolder(folderId: string): Promise<ImageFile[]> {
    await delay(400);
    // Return a shallow copy to ensure React detects state changes
    return [...(db.images[folderId] || [])];
  },

  async uploadImage(data: File | string, folderId: string): Promise<void> {
    await delay(1000);
    const folder = db.folders.find(f => f.id === folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }
    
    let displayUrl: string;
    let name: string;

    if (typeof data === 'string') {
      displayUrl = data;
      try {
        const urlPath = new URL(data).pathname;
        name = urlPath.substring(urlPath.lastIndexOf('/') + 1) || 'image.jpg';
      } catch (e) {
        name = 'image_from_url.jpg';
      }
    } else {
      displayUrl = await fileToDataUrl(data);
      name = data.name;
    }

    const folderSlug = slugify(folder.name);
    const cdnUrl = `https://cdn.greenecom.net/${folderSlug}/${name}`;

    const newImage: ImageFile = {
      id: `img-${Date.now()}`,
      name,
      url: cdnUrl,
      displayUrl,
      uploadedAt: new Date(),
    };

    if (!db.images[folderId]) {
      db.images[folderId] = [];
    }
    db.images[folderId].unshift(newImage); // Add to the beginning
    saveDb();
  },

  async createUser(username: string, password: string): Promise<User> {
    await delay(500);
    if (db.users.some(u => u.username === username)) {
      throw new Error('Username already exists');
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      role: Role.MEMBER, // Only members can be created via UI
    };
    db.users.push(newUser);
    saveDb();
    // NOTE: Password isn't stored in this mock. A real backend would handle it.
    return newUser;
  },

  async createFolder(name: string): Promise<Folder> {
      await delay(500);
      if (db.folders.some(f => f.name === name)) {
          throw new Error('Folder name already exists');
      }
      const newFolder: Folder = {
          id: `folder-${Date.now()}`,
          name,
          assignedUserIds: [],
      };
      db.folders.push(newFolder);
      db.images[newFolder.id] = [];
      saveDb();
      return newFolder;
  },

  async assignUserToFolder(userId: string, folderId: string): Promise<void> {
      await delay(500);
      const folder = db.folders.find(f => f.id === folderId);
      const user = db.users.find(u => u.id === userId);

      if (!folder || !user) {
          throw new Error('User or folder not found');
      }

      if (!folder.assignedUserIds.includes(userId)) {
          folder.assignedUserIds.push(userId);
          saveDb();
      }
  },

  async deleteImage(imageId: string, folderId: string): Promise<void> {
    await delay(500);
    if (!db.images[folderId]) {
      throw new Error('Folder not found');
    }
    
    db.images[folderId] = db.images[folderId].filter(img => img.id !== imageId);
    saveDb();
  },
};