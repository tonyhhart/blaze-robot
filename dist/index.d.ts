declare let balance: number;
declare const previousCrashes: any;
declare const betHistory: BetHistory[];
declare const STOP_WIN = 2;
declare let EXPONENT_PUSH_TOKEN: string;
declare let BET_PERCENTAGE: number;
declare let interval: number;
declare function checkPreviousCrashes(data: CrashUpdate): void;
declare function updatePreviousCrashes({ payload: { id, crash_point } }: CrashUpdate): void;
declare function enterPosition(data: CrashUpdate): void;
declare function sendNotification(title: string, body: string): void;
declare type CrashUpdate = {
    id: "crash.update";
    payload: {
        id: number;
        x: number;
        y: number;
        created_at: string;
        updated_at: string;
        status: "waiting" | "graphing" | "complete";
        crash_point: number;
    };
};
declare type BetHistory = {
    balance: number;
    amount: number;
    crash_point?: number;
    status: "bet" | "win" | "loss";
    created_at: string;
};
declare function startSocket(): void;
