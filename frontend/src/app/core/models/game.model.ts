// Placeholder for Game Models
export interface GameAdminListItem {
  id: string;
  name: string;
  game_status: 'pending' | 'in_progress' | 'finished' | 'archived';
  current_round_number: number;
  max_players: number;
  // Add other relevant fields for the list item
}

export interface GameDetailsView extends GameAdminListItem {
  // Add detailed view specific fields
  created_at: string; // Example
  updated_at: string; // Example
}

export interface GameCreateAdminPayload {
  name: string;
  number_of_players: number;
  // Add other fields needed for game creation
}
