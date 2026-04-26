export interface RealtimeEvent<T> {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  old: Partial<T> | null;
  new: Partial<T> | null;
}
