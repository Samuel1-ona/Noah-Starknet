export class NoahError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'NoahError';
    }
}

export class NoahScanError extends NoahError {
    constructor(message: string, public readonly rawText?: string) {
        super(message, 'SCAN_ERROR');
        this.name = 'NoahScanError';
    }
}

export class NoahProverError extends NoahError {
    constructor(message: string) {
        super(message, 'PROVER_ERROR');
        this.name = 'NoahProverError';
    }
}

export class NoahContractError extends NoahError {
    constructor(message: string) {
        super(message, 'CONTRACT_ERROR');
        this.name = 'NoahContractError';
    }
}

export class NoahContractRevertError extends NoahContractError {
    constructor(message: string, public readonly rawError: any) {
        super(message);
        this.name = 'NoahContractRevertError';
    }
}
