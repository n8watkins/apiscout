export type AuthType = "none" | "apiKey" | "oauth" | "other";

export interface Api {
  name: string;
  url: string;
  description: string;
  category: string;
  auth: AuthType;
  authLabel: string;
  https: boolean | null;
  cors: boolean | null;
}

export interface ApiData {
  generatedAt: string;
  source: string;
  count: number;
  categoryCount: number;
  categories: string[];
  stats: {
    noAuth: number;
    cors: number;
    https: number;
    corsNoAuth: number;
  };
  apis: Api[];
}
