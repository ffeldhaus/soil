export enum UserRole {
    ADMIN = 'admin',
    PLAYER = 'player',
  }
  
  export interface User {
    uid: string;
    email: string | null;
    role: UserRole | null;
    displayName?: string | null; 
    username?: string | null; // Added username as it can be on Player or Admin
    firstName?: string; 
    lastName?: string;  
    institution?: string; 
    gameId?: string; 
    playerNumber?: number; 
    isAi?: boolean; 
    impersonatorUid?: string; 
  }
  
  export type AuthUserInfo = User & {
    // This interface is for the user_info part of the Token response.
    // Ensure its properties match what auth.py constructs for user_info dict.
    // If AuthUserInfo can have additional properties not in User, define them here.
    // For example: extraAuthField?: string;
  };

// Payload for admin registration
export interface AdminRegisterPayload {
  firstName: string;
  lastName: string;
  institution: string;
  email: string;
  password: string; // Note: In a real app, never store plain passwords long-term
  displayName?: string; // Optional, often derived from firstName and lastName
}
