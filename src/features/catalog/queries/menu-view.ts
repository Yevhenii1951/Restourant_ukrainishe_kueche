export interface PublicDish {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  allergens: string[];
  available: boolean;
  published: boolean;
  imageAlt: string;
}
