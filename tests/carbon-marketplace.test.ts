import { describe, it, expect, beforeEach, vi } from "vitest";

interface ListingDetails {
  seller: string;
  price: bigint;
  nftContract: string;
}

interface MockContract {
  admin: string;
  paused: boolean;
  marketplaceFee: bigint;
  feeRecipient: string;
  eventHandler: string | null;
  listings: Map<bigint, ListingDetails>;
  carbonCreditContract: Map<string, boolean>;
  MAX_FEE_PERCENT: bigint;
  isAdmin(caller: string): boolean;
  checkNftOwnership(nftContract: string, tokenId: bigint, owner: string): boolean;
  setEventHandler(caller: string, handler: string): { value: boolean } | { error: number };
  transferAdmin(caller: string, newAdmin: string): { value: boolean } | { error: number };
  setMarketplaceFee(caller: string, fee: bigint): { value: boolean } | { error: number };
  setFeeRecipient(caller: string, recipient: string): { value: boolean } | { error: number };
  approveNftContract(caller: string, nftContract: string): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  listNft(caller: string, tokenId: bigint, nftContract: string, price: bigint): { value: boolean } | { error: number };
  cancelListing(caller: string, tokenId: bigint): { value: boolean } | { error: number };
  buyNft(caller: string, tokenId: bigint, buyerBalance: bigint): { value: boolean } | { error: number };
  getListing(tokenId: bigint): { value: ListingDetails } | { error: number };
  getMarketplaceFee(): { value: bigint };
  getFeeRecipient(): { value: string };
  getAdmin(): { value: string };
  isPaused(): { value: boolean };
  isNftContractApproved(nftContract: string): { value: boolean };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  marketplaceFee: 500n,
  feeRecipient: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  eventHandler: null,
  listings: new Map<bigint, ListingDetails>(),
  carbonCreditContract: new Map<string, boolean>(),
  MAX_FEE_PERCENT: 10000n,

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  checkNftOwnership(nftContract: string, tokenId: bigint, owner: string) {
    return true; // Mocked to simulate successful ownership check
  },

  setEventHandler(caller: string, handler: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.eventHandler = handler;
    return { value: true };
  },

  transferAdmin(caller: string, newAdmin: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 103 };
    this.admin = newAdmin;
    return { value: true };
  },

  setMarketplaceFee(caller: string, fee: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (fee > this.MAX_FEE_PERCENT) return { error: 105 };
    this.marketplaceFee = fee;
    return { value: true };
  },

  setFeeRecipient(caller: string, recipient: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 103 };
    this.feeRecipient = recipient;
    return { value: true };
  },

  approveNftContract(caller: string, nftContract: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (nftContract === "SP000000000000000000002Q6VF78") return { error: 103 };
    this.carbonCreditContract.set(nftContract, true);
    return { value: true };
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  listNft(caller: string, tokenId: bigint, nftContract: string, price: bigint) {
    if (this.paused) return { error: 106 };
    if (!this.carbonCreditContract.get(nftContract)) return { error: 100 };
    if (!this.checkNftOwnership(nftContract, tokenId, caller)) return { error: 108 };
    if (this.listings.has(tokenId)) return { error: 102 };
    if (price <= 0n) return { error: 104 };
    this.listings.set(tokenId, { seller: caller, price, nftContract });
    return { value: true };
  },

  cancelListing(caller: string, tokenId: bigint) {
    if (this.paused) return { error: 106 };
    const listing = this.listings.get(tokenId);
    if (!listing) return { error: 101 };
    if (listing.seller !== caller) return { error: 100 };
    this.listings.delete(tokenId);
    return { value: true };
  },

  buyNft(caller: string, tokenId: bigint, buyerBalance: bigint) {
    if (this.paused) return { error: 106 };
    const listing = this.listings.get(tokenId);
    if (!listing) return { error: 101 };
    if (caller === listing.seller) return { error: 100 };
    if (buyerBalance < listing.price) return { error: 107 };
    this.listings.delete(tokenId);
    return { value: true };
  },

  getListing(tokenId: bigint) {
    const listing = this.listings.get(tokenId);
    return listing ? { value: listing } : { error: 101 };
  },

  getMarketplaceFee() {
    return { value: this.marketplaceFee };
  },

  getFeeRecipient() {
    return { value: this.feeRecipient };
  },

  getAdmin() {
    return { value: this.admin };
  },

  isPaused() {
    return { value: this.paused };
  },

  isNftContractApproved(nftContract: string) {
    return { value: this.carbonCreditContract.get(nftContract) || false };
  },
};

describe("CarbonMarketplace Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.marketplaceFee = 500n;
    mockContract.feeRecipient = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.eventHandler = null;
    mockContract.listings = new Map();
    mockContract.carbonCreditContract = new Map();
  });

  describe("Admin Functions", () => {
    it("should allow admin to set event handler", () => {
      const result = mockContract.setEventHandler(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: true });
      expect(mockContract.eventHandler).toBe("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
    });

    it("should prevent non-admin from setting event handler", () => {
      const result = mockContract.setEventHandler("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 100 });
    });

    it("should allow admin to transfer admin rights", () => {
      const result = mockContract.transferAdmin(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: true });
      expect(mockContract.admin).toBe("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
    });

    it("should prevent non-admin from transferring admin rights", () => {
      const result = mockContract.transferAdmin("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent transferring admin rights to zero address", () => {
      const result = mockContract.transferAdmin(mockContract.admin, "SP000000000000000000002Q6VF78");
      expect(result).toEqual({ error: 103 });
    });

    it("should allow admin to set marketplace fee", () => {
      const result = mockContract.setMarketplaceFee(mockContract.admin, 1000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.marketplaceFee).toBe(1000n);
    });

    it("should prevent non-admin from setting marketplace fee", () => {
      const result = mockContract.setMarketplaceFee("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent setting invalid fee", () => {
      const result = mockContract.setMarketplaceFee(mockContract.admin, 15000n);
      expect(result).toEqual({ error: 105 });
    });

    it("should allow admin to set fee recipient", () => {
      const result = mockContract.setFeeRecipient(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: true });
      expect(mockContract.feeRecipient).toBe("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
    });

    it("should prevent non-admin from setting fee recipient", () => {
      const result = mockContract.setFeeRecipient("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent setting fee recipient to zero address", () => {
      const result = mockContract.setFeeRecipient(mockContract.admin, "SP000000000000000000002Q6VF78");
      expect(result).toEqual({ error: 103 });
    });

    it("should allow admin to approve NFT contract", () => {
      const result = mockContract.approveNftContract(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: true });
      expect(mockContract.carbonCreditContract.get("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH")).toBe(true);
    });

    it("should prevent non-admin from approving NFT contract", () => {
      const result = mockContract.approveNftContract("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent approving zero address as NFT contract", () => {
      const result = mockContract.approveNftContract(mockContract.admin, "SP000000000000000000002Q6VF78");
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

  describe("Marketplace Operations", () => {
    beforeEach(() => {
      mockContract.approveNftContract(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
    });

    it("should list NFT for sale", () => {
      const result = mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.listings.get(1n)).toEqual({
        seller: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        price: 1000000n,
        nftContract: "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
      });
    });

    it("should prevent listing with unapproved NFT contract", () => {
      const result = mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 1000000n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent listing with invalid price", () => {
      const result = mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 0n);
      expect(result).toEqual({ error: 104 });
    });

    it("should prevent listing already listed NFT", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      const result = mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000000n);
      expect(result).toEqual({ error: 102 });
    });

    it("should prevent listing when paused", () => {
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      expect(result).toEqual({ error: 106 });
    });

    it("should cancel listing", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      const result = mockContract.cancelListing("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n);
      expect(result).toEqual({ value: true });
      expect(mockContract.listings.has(1n)).toBe(false);
    });

    it("should prevent non-seller from cancelling listing", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      const result = mockContract.cancelListing("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 1n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent cancelling non-existent listing", () => {
      const result = mockContract.cancelListing("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n);
      expect(result).toEqual({ error: 101 });
    });

    it("should prevent cancelling when paused", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.cancelListing("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n);
      expect(result).toEqual({ error: 106 });
    });

    it("should buy NFT", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      const result = mockContract.buyNft("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 1n, 2000000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.listings.has(1n)).toBe(false);
    });

    it("should prevent buying non-existent listing", () => {
      const result = mockContract.buyNft("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 1n, 2000000n);
      expect(result).toEqual({ error: 101 });
    });

    it("should prevent seller from buying own NFT", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      const result = mockContract.buyNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, 2000000n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent buying with insufficient balance", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      const result = mockContract.buyNft("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 1n, 500000n);
      expect(result).toEqual({ error: 107 });
    });

    it("should prevent buying when paused", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.buyNft("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 1n, 2000000n);
      expect(result).toEqual({ error: 106 });
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      mockContract.approveNftContract(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
    });

    it("should get listing details", () => {
      mockContract.listNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n);
      const result = mockContract.getListing(1n);
      expect(result).toEqual({
        value: {
          seller: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
          price: 1000000n,
          nftContract: "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        },
      });
    });

    it("should return error for non-existent listing", () => {
      const result = mockContract.getListing(1n);
      expect(result).toEqual({ error: 101 });
    });

    it("should get marketplace fee", () => {
      const result = mockContract.getMarketplaceFee();
      expect(result).toEqual({ value: 500n });
    });

    it("should get fee recipient", () => {
      const result = mockContract.getFeeRecipient();
      expect(result).toEqual({ value: mockContract.feeRecipient });
    });

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

    it("should check if NFT contract is approved", () => {
      mockContract.approveNftContract(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      const result = mockContract.isNftContractApproved("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: true });

      const result2 = mockContract.isNftContractApproved("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result2).toEqual({ value: false });
    });
  });
});