import type { Property, Auction, Bid, User, Makelaar } from '../types';

export const mockMakelaars: Makelaar[] = [
  {
    id: 2,
    company_name: 'Van der Berg Makelaardij',
    contact_name: 'Thomas van der Berg',
    email: 'info@vdberg-makelaardij.nl',
    phone: '020-555-1234',
    logo_initials: 'VdB',
    logo_color: '#1B4F72',
  },
  {
    id: 3,
    company_name: 'De Groot & Partners',
    contact_name: 'Sandra de Groot',
    email: 'info@degrootpartners.nl',
    phone: '070-444-5678',
    logo_initials: 'DG',
    logo_color: '#4A148C',
  },
];

export const mockUser: User = {
  id: 1,
  email: 'jan.de.vries@email.nl',
  full_name: 'Jan de Vries',
  wallet_address: null,
  role: 'bidder',
  status: 'active',
  idin_verified: true,
  assigned_property_id: 1,
  created_at: '2026-03-01T10:00:00Z',
  verified_at: '2026-03-05T14:30:00Z',
};

export const mockProperties: Property[] = [
  {
    id: 1,
    seller_id: 2,
    address: 'Keizersgracht 123',
    postal_code: '1015 CN',
    city: 'Amsterdam',
    description:
      'Prachtig grachtenpand in het hart van Amsterdam. Lichte woonkamer met uitzicht op de gracht, moderne keuken, 3 slaapkamers en een dakterras.',
    asking_price: 875000,
    status: 'active',
    created_at: '2026-04-01T09:00:00Z',
    rooms: 4,
    area_m2: 142,
    energy_label: 'B',
  },
  {
    id: 2,
    seller_id: 2,
    address: 'Wilhelminastraat 45',
    postal_code: '3581 KL',
    city: 'Utrecht',
    description:
      'Ruime gezinswoning in rustige buurt. Tuin op het zuiden, garage, 5 slaapkamers. Nabij uitvalswegen en openbaar vervoer.',
    asking_price: 620000,
    status: 'active',
    created_at: '2026-04-05T11:00:00Z',
    rooms: 5,
    area_m2: 185,
    energy_label: 'A',
  },
  {
    id: 3,
    seller_id: 3,
    address: 'Binnenhof 7',
    postal_code: '2513 AA',
    city: 'Den Haag',
    description:
      'Stijlvol appartement op steenworp van het centrum. Volledig gerenoveerd, 2 slaapkamers, eigen parkeerplaats.',
    asking_price: 430000,
    status: 'active',
    created_at: '2026-04-10T08:00:00Z',
    rooms: 2,
    area_m2: 89,
    energy_label: 'A+',
  },
  {
    id: 4,
    seller_id: 2,
    address: 'Havenstraat 22',
    postal_code: '3011 BB',
    city: 'Rotterdam',
    description:
      'Modern loft in voormalig havengebouw. Hoge plafonds, open keuken, industrieel design. Dichtbij de Erasmusbrug.',
    asking_price: 510000,
    status: 'active',
    created_at: '2026-04-12T13:00:00Z',
    rooms: 3,
    area_m2: 118,
    energy_label: 'B',
  },
];

export const mockAuctions: Auction[] = [
  {
    id: 1,
    property_id: 1,
    contract_auction_id: 101,
    start_date: '2026-04-14T09:00:00Z',
    deadline: '2026-04-22T17:00:00Z',
    status: 'open',
    bid_count: 7,
  },
  {
    id: 2,
    property_id: 2,
    contract_auction_id: 102,
    start_date: '2026-04-16T09:00:00Z',
    deadline: '2026-04-26T17:00:00Z',
    status: 'open',
    bid_count: 3,
  },
  {
    id: 3,
    property_id: 3,
    contract_auction_id: 103,
    start_date: '2026-04-10T09:00:00Z',
    deadline: '2026-04-17T17:00:00Z',
    status: 'closed',
    winner_wallet: '0xAbC123...def456',
    bid_count: 12,
  },
  {
    id: 4,
    property_id: 4,
    contract_auction_id: 104,
    start_date: '2026-04-18T09:00:00Z',
    deadline: '2026-04-28T17:00:00Z',
    status: 'open',
    bid_count: 5,
  },
];

export const mockBids: Bid[] = [
  {
    id: 1,
    auction_id: 1,
    bidder_wallet: '0x1234...5678',
    amount_usdc: 880000,
    tx_hash: '0xabc123def456789012345678901234567890123456789012345678901234567890',
    block_number: 58421001,
    indexed_at: '2026-04-14T10:15:00Z',
  },
  {
    id: 2,
    auction_id: 1,
    bidder_wallet: '0x9abc...def0',
    amount_usdc: 892000,
    tx_hash: '0xbcd234ef5678901234567890123456789012345678901234567890123456789012',
    block_number: 58421145,
    indexed_at: '2026-04-14T11:30:00Z',
  },
  {
    id: 3,
    auction_id: 1,
    bidder_wallet: '0x5f6a...7b8c',
    amount_usdc: 895000,
    tx_hash: '0xcde345f0678901234567890123456789012345678901234567890123456789012',
    block_number: 58422301,
    indexed_at: '2026-04-15T09:00:00Z',
  },
];
