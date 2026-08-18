export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  backdrop?: string;
  type: "movie" | "series";
  year?: string;
  episodes?: Episode[];
  category?: "gctunes" | "greek_streaming";
  genres?: string[];
}

export type LibraryAccessType = "gctunes" | "greek_streaming" | "both";

export interface PriceResponse {
  price: number;
}

export interface CheckoutResponse {
  invoiceId: string;
  address: string;
}

export interface VerifyResponse {
  success: boolean;
  licenseKey: string;
}

export interface LoginResponse {
  success: boolean;
  isAdmin: boolean;
  libraryAccess?: LibraryAccessType;
  error?: string;
}
