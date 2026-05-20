export type UserRole = 'bidder' | 'seller' | 'makelaar' | 'admin';
export type UserStatus = 'invited' | 'verified' | 'active';
export type PropertyStatus = 'draft' | 'active' | 'sold';
export type AuctionStatus = 'open' | 'closed' | 'settled';

export interface Makelaar {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  logo_initials: string;
  logo_color: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  wallet_address: string | null;
  role: UserRole;
  status: UserStatus;
  idin_verified: boolean;
  assigned_property_id?: number;
  registered_by?: number;
  verified_at?: string;
  created_at: string;
}

export interface Property {
  id: number;
  seller_id: number;
  address: string;
  postal_code?: string;
  city?: string;
  description: string;
  asking_price: number;
  status: PropertyStatus;
  created_at: string;
  images?: string[];
  rooms?: number;
  area_m2?: number;
  energy_label?: string;
  makelaar?: Makelaar | null;
}

export interface Auction {
  id: number;
  property_id: number;
  contract_auction_id?: number;
  start_date: string;
  deadline: string;
  status: AuctionStatus;
  winner_wallet?: string | null;
  bid_count?: number;
}

export interface Bid {
  id: number;
  auction_id: number;
  bidder_wallet: string;
  amount_usdc: number;
  tx_hash: string;
  block_number: number;
  indexed_at: string;
  bidder_name?: string;
  bidder_email?: string;
  bidder_phone?: string;
  financing_condition?: boolean;
}
