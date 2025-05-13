export enum UserRole {
    ADMIN = 'admin',
    PLAYER = 'player',
    // SUPERUSER = 'superuser' // If needed later
  }
  
  export interface User {
    uid: string;
    email: string | null;
    role: UserRole | null;
    displayName?: string | null; // For Firebase display name
    firstName?: string; // Specific to Admin
    lastName?: string;  // Specific to Admin
    institution?: string; // Specific to Admin
    gameId?: string; // Specific to Player
    playerNumber?: number; // Specific to Player
    isAi?: boolean; // Specific to Player
    impersonatorUid?: string; // UID of the admin if this user is being impersonated
    // Add other common or type-specific fields as needed
  }
  
  // Interface for the user info part of the backend's token response
  export interface AuthUserInfo extends User {
    // Backend might return slightly different structure, adjust as needed
  }