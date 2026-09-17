export interface ContentPage {
  slug: string;
  locale: "de" | "en" | "uk";
  title: string;
  body: string;
  published: boolean;
  version: number;
  updatedAt: string;
}
