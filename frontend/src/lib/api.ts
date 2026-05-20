import type { Auction, Bid, Makelaar, Property, User } from '../types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('osso_token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('osso_token');
    window.location.href = '/login';
    throw new Error('Niet ingelogd');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'API fout');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Inloggen mislukt' }));
    throw new Error(err.detail ?? 'Inloggen mislukt');
  }
  const data = await res.json();
  localStorage.setItem('osso_token', data.access_token);
  return data.access_token;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  role: string,
  companyName?: string,
): Promise<User> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name: fullName, role, company_name: companyName }),
  });
}

export function logout(): void {
  localStorage.removeItem('osso_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ── iDIN (mock) ───────────────────────────────────────────────────────────────

export async function idinStart(walletAddress: string): Promise<void> {
  await request('/auth/idin/start', {
    method: 'POST',
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
}

export async function idinCallback(
  idinIdentifier: string,
  walletAddress: string,
  fullName?: string,
): Promise<void> {
  await request('/auth/idin/callback', {
    method: 'POST',
    body: JSON.stringify({
      idin_identifier: idinIdentifier,
      wallet_address: walletAddress,
      full_name: fullName,
    }),
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getMe(): Promise<User> {
  return request('/users/me');
}

export async function updateMe(data: { full_name?: string; wallet_address?: string }): Promise<User> {
  return request('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function inviteUser(email: string, fullName: string, propertyId?: number): Promise<User> {
  return request('/users/invite', {
    method: 'POST',
    body: JSON.stringify({ email, full_name: fullName, property_id: propertyId ?? null }),
  });
}

// ── Properties ────────────────────────────────────────────────────────────────

export async function getProperties(): Promise<Property[]> {
  return request('/properties/');
}

export async function getProperty(id: number): Promise<Property> {
  return request(`/properties/${id}`);
}

export async function createProperty(data: {
  address: string;
  postal_code?: string;
  city?: string;
  description?: string;
  asking_price: number;
  rooms?: number;
  area_m2?: number;
  energy_label?: string;
  images?: string[];
}): Promise<Property> {
  return request('/properties/', { method: 'POST', body: JSON.stringify(data) });
}

// ── Auctions ─────────────────────────────────────────────────────────────────

export async function getAuctions(): Promise<Auction[]> {
  return request('/auctions/');
}

export async function getAuction(id: number): Promise<Auction> {
  return request(`/auctions/${id}`);
}

export async function createAuction(data: {
  property_id: number;
  start_date: string;
  deadline: string;
}): Promise<Auction> {
  return request('/auctions/', { method: 'POST', body: JSON.stringify(data) });
}

// ── Bids ──────────────────────────────────────────────────────────────────────

export async function getBids(auctionId: number): Promise<Bid[]> {
  return request(`/auctions/${auctionId}/bids`);
}

export async function placeBid(
  auctionId: number,
  data: {
    amount_usdc: number;
    financing_condition: boolean;
  },
): Promise<Bid> {
  return request(`/auctions/${auctionId}/bids`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Makelaars ─────────────────────────────────────────────────────────────────

export async function getMakelaars(): Promise<Makelaar[]> {
  return request('/makelaars/');
}

export async function nvmApprove(): Promise<{ message: string; status: string }> {
  return request('/auth/nvm/approve', { method: 'POST' });
}

// ── Blockchain feed ───────────────────────────────────────────────────────────

export interface BlockchainEntry {
  id: number;
  tx_hash: string;
  block_number: number;
  bidder_wallet: string;
  auction_id: number;
  property_address: string;
  financing_condition: boolean;
  indexed_at: string;
}

export async function getBlockchainFeed(limit = 100): Promise<BlockchainEntry[]> {
  return request(`/blockchain/feed?limit=${limit}`);
}
