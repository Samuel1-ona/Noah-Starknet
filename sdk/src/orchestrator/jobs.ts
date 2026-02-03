import { NoahStorage } from '../storage/base';

export enum JobStatus {
    PENDING = 'PENDING',
    PROVING = 'PROVING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export interface NoahJob {
    id: string;
    status: JobStatus;
    timestamp: number;
    transactionHash?: string;
    error?: string;
    publicInputs?: string[];
}

export class NoahJobManager {
    private readonly STORAGE_KEY = 'jobs';

    constructor(private storage: NoahStorage) { }

    async saveJob(job: NoahJob): Promise<void> {
        const jobs = await this.getAllJobs();
        const index = jobs.findIndex(j => j.id === job.id);
        if (index > -1) {
            jobs[index] = job;
        } else {
            jobs.push(job);
        }
        await this.storage.setItem(this.STORAGE_KEY, JSON.stringify(jobs));
    }

    async getJob(id: string): Promise<NoahJob | undefined> {
        const jobs = await this.getAllJobs();
        return jobs.find(j => j.id === id);
    }

    async getAllJobs(): Promise<NoahJob[]> {
        const data = await this.storage.getItem(this.STORAGE_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async clearExpiredJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
        const now = Date.now();
        const jobs = await this.getAllJobs();
        const filtered = jobs.filter(j => now - j.timestamp < maxAgeMs);
        await this.storage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    }
}
