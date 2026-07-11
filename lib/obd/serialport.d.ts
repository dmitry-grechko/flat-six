declare module 'serialport' {
  export interface PortInfo {
    path: string;
    manufacturer?: string | null;
    serialNumber?: string | null;
    vendorId?: string | null;
    productId?: string | null;
  }

  export class SerialPort {
    constructor(options: {
      path: string;
      baudRate: number;
      autoOpen?: boolean;
    });
    isOpen: boolean;
    setMaxListeners(n: number): void;
    open(cb: (err: Error | null) => void): void;
    close(cb: (err?: Error | null) => void): void;
    write(data: string, cb: (err: Error | null | undefined) => void): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
    off(event: string, cb: (...args: unknown[]) => void): void;
    static list(): Promise<PortInfo[]>;
  }
}
