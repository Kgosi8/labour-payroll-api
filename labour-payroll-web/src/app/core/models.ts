export type Role = 'admin' | 'supervisor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Address {
  street: string;
  suburb?: string;
  city: string;
  postalCode?: string;
}

export type AccountType = 'cheque' | 'savings' | 'transmission';
export type WorkerStatus = 'active' | 'inactive';

/** What the list endpoint returns. Supervisors get no `bank`; admins get a masked one. */
export interface WorkerListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address: Address;
  status: WorkerStatus;
  bank?: { bankName: string; accountLast4: string };
}

/** Admin-only detail with decrypted values. */
export interface WorkerDetail {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address: Address;
  status: WorkerStatus;
  idNumber: string;
  bank: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    branchCode: string;
    accountType: AccountType;
  };
}

export interface WorkerInput {
  firstName: string;
  lastName: string;
  idNumber: string;
  phone?: string;
  address: Address;
  bank: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    branchCode: string;
    accountType: AccountType;
  };
}

export interface SettingsPosition {
  _id: string;
  name: string;
  shareBps: number; // basis points: 2000 = 20%
}

export interface Settings {
  companyName: string;
  ratePerHouseCents: number;
  positions: SettingsPosition[];
}

export interface SettingsInput {
  companyName: string;
  ratePerHouseCents: number;
  positions: { id?: string; name: string; shareBps: number }[];
}
