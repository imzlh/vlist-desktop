import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  const electron: ElectronAPI;
  const api: Record<string, any>;
}
