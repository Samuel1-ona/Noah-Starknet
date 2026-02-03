import { NoahStorage } from './base';

export class BrowserStorage implements NoahStorage {
    async getItem(key: string): Promise<string | null> {
        return localStorage.getItem(`noah_${key}`);
    }

    async setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(`noah_${key}`, value);
    }

    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(`noah_${key}`);
    }
}
