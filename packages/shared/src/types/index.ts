export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
}

export type PaginationParams = {
  page: number;
  limit: number;
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
