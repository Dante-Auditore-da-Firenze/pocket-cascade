export interface PocketDesktop {
  readSave(): Promise<{ data: string | null; recovered: boolean; error?: string }>;
  writeSave(json: string): Promise<{ ok: boolean; error?: string }>;
  exportSave(json: string): Promise<{ ok: boolean; canceled?: boolean; error?: string }>;
  setFullscreen(value: boolean): Promise<boolean>;
  getStatus(): Promise<{ platform: string; version: string; steam: boolean; steamError?: string }>;
  unlockAchievement(id: string): Promise<boolean>;
  quit(): void;
}