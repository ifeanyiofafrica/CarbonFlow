import { describe, it, expect, beforeEach } from "vitest";

interface EventDetails {
  tokenId: bigint;
  actor: string;
  price: bigint;
  nftContract: string;
  isCancelled: boolean;
  timestamp: bigint;
}

interface MockContract {
  admin: string;
  paused: boolean;
  eventIdCounter: bigint;
  events: Map<bigint, EventDetails>;
  isAdmin(caller: string): boolean;
  setAdmin(caller: string, newAdmin: string): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  emitEvent(tokenId: bigint, actor: string, price: bigint, nftContract: string, isCancelled: boolean, blockHeight: bigint): { value: boolean } | { error: number };
  getAdmin(): { value: string };
  isPaused(): { value: boolean };
  getEvent(eventId: bigint): { value: EventDetails } | { error: number };
  getEventCounter(): { value: bigint };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  eventIdCounter: 0n,
  events: new Map<bigint, EventDetails>(),

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  setAdmin(caller: string, newAdmin: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 103 };
    this.admin = newAdmin;
    return { value: true };
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  emitEvent(tokenId: bigint, actor: string, price: bigint, nftContract: string, isCancelled: boolean, blockHeight: bigint) {
    if (this.paused) return { error: 100 };
    const eventId = this.eventIdCounter;
    this.events.set(eventId, { tokenId, actor, price, nftContract, isCancelled, timestamp: blockHeight });
    this.eventIdCounter += 1n;
    return { value: true };
  },

  getAdmin() {
    return { value: this.admin };
  },

  isPaused() {
    return { value: this.paused };
  },

  getEvent(eventId: bigint) {
    const event = this.events.get(eventId);
    return event ? { value: event } : { error: 101 };
  },

  getEventCounter() {
    return { value: this.eventIdCounter };
  },
};

describe("EventHandler Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.eventIdCounter = 0n;
    mockContract.events = new Map();
  });

  describe("Admin Functions", () => {
    it("should allow admin to set new admin", () => {
      const result = mockContract.setAdmin(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: true });
      expect(mockContract.admin).toBe("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
    });

    it("should prevent non-admin from setting new admin", () => {
      const result = mockContract.setAdmin("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent setting zero address as admin", () => {
      const result = mockContract.setAdmin(mockContract.admin, "SP000000000000000000002Q6VF78");
      expect(result).toEqual({ error: 103 });
    });

    it("should allow admin to pause/unpause contract", () => {
      let result = mockContract.setPaused(mockContract.admin, true);
      expect(result).toEqual({ value: true });
      expect(mockContract.paused).toBe(true);

      result = mockContract.setPaused(mockContract.admin, false);
      expect(result).toEqual({ value: false });
      expect(mockContract.paused).toBe(false);
    });

    it("should prevent non-admin from pausing contract", () => {
      const result = mockContract.setPaused("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", true);
      expect(result).toEqual({ error: 100 });
    });
  });

  describe("Event Emission", () => {
    it("should emit event successfully", () => {
      const result = mockContract.emitEvent(1n, "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1000000n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", false, 1000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.events.get(0n)).toEqual({
        tokenId: 1n,
        actor: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        price: 1000000n,
        nftContract: "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        isCancelled: false,
        timestamp: 1000n,
      });
      expect(mockContract.eventIdCounter).toBe(1n);
    });

    it("should prevent event emission when paused", () => {
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.emitEvent(1n, "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1000000n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", false, 1000n);
      expect(result).toEqual({ error: 100 });
      expect(mockContract.events.size).toBe(0);
    });
  });

  describe("Read-Only Functions", () => {
    it("should get admin", () => {
      const result = mockContract.getAdmin();
      expect(result).toEqual({ value: mockContract.admin });
    });

    it("should check if paused", () => {
      let result = mockContract.isPaused();
      expect(result).toEqual({ value: false });

      mockContract.setPaused(mockContract.admin, true);
      result = mockContract.isPaused();
      expect(result).toEqual({ value: true });
    });

    it("should get event details", () => {
      mockContract.emitEvent(1n, "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1000000n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", false, 1000n);
      const result = mockContract.getEvent(0n);
      expect(result).toEqual({
        value: {
          tokenId: 1n,
          actor: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
          price: 1000000n,
          nftContract: "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
          isCancelled: false,
          timestamp: 1000n,
        },
      });
    });

    it("should return error for non-existent event", () => {
      const result = mockContract.getEvent(0n);
      expect(result).toEqual({ error: 101 });
    });

    it("should get event counter", () => {
      mockContract.emitEvent(1n, "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1000000n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", false, 1000n);
      const result = mockContract.getEventCounter();
      expect(result).toEqual({ value: 1n });
    });
  });
});