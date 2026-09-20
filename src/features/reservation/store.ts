import type {
  ReservationAccessConfig,
  ReservationClosureInput,
  ReservationCombinationInput,
  ReservationTableInput,
  ReservationWindowInput,
} from "./domain";

export interface ReservationTableRow {
  id: string;
  internalLabel: string;
  capacity: number;
  area: string;
  active: boolean;
}

export interface ReservationTableWrite {
  id?: string;
  internalLabel: string;
  capacity: number;
  area: string;
  active: boolean;
}

export interface ReservationCombinationRow {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
  memberTableIds: string[];
}

export interface ReservationCombinationWrite {
  id?: string;
  name: string;
  active: boolean;
  memberTableIds: string[];
}

export interface ReservationStore {
  getReservationConfig(): Promise<ReservationAccessConfig | null>;
  listTables(): Promise<ReservationTableRow[]>;
  saveTable(input: ReservationTableWrite): Promise<ReservationTableRow>;
  listCombinations(): Promise<ReservationCombinationRow[]>;
  saveCombination(input: ReservationCombinationWrite): Promise<ReservationCombinationRow>;
  listReservationWindows(): Promise<ReservationWindowInput[]>;
  listReservationClosures(): Promise<ReservationClosureInput[]>;
}

export type ReservationInventory = {
  tables: ReservationTableInput[];
  combinations: ReservationCombinationInput[];
};