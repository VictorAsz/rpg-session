export interface BaseEntity {
  id: string;
  created_at: string; // ISO 8601 (TIMESTAMPTZ do Postgres)
}
