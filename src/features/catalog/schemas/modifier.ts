export interface ModifierGroup {
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  name: string;
  priceDeltaCents: number;
}
