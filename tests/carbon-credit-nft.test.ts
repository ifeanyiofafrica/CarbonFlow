import { describe, it, expect, beforeEach } from "vitest";

interface CreditDetails {
  co2Tons: bigint;
  projectId: string;
  issuer: string;
  isRetired: boolean;
  verified: boolean;
}

interface ProjectVerification {
  verified: boolean;
  auditor: string;
}

interface MockContract {
  admin: string;
  auditor: string;
  paused: boolean;
  tokenIdCounter: bigint;
  eventHandler: string | null;
  carbonCredits: Map<bigint, CreditDetails>;
  tokenOwners: Map<bigint, string>;
  projectVerifications: Map<string, ProjectVerification>;
  MAX_BATCH_MINT: bigint;
  isAdmin(caller: string): boolean;
  isAuditor(caller: string): boolean;
  setEventHandler(caller: string, handler: string): { value: boolean } | { error: number };
  transferAdmin(caller: string, newAdmin: string): { value: boolean } | { error: number };
  setAuditor(caller: string, newAuditor: string): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  verifyProject(caller: string, projectId: string): { value: boolean } | { error: number };
  mint(caller: string, recipient: string, co2Tons: bigint, projectId: string): { value: bigint } | { error: number };
  batchMint(caller: string, recipients: string[], co2TonsList: bigint[], projectId: string): { value: bigint } | { error: number };
  transfer(caller: string, tokenId: bigint, recipient: string): { value: boolean } | { error: number };
  retire(caller: string, tokenId: bigint): { value: boolean } | { error: number };
  getCreditDetails(tokenId: bigint): { value: CreditDetails } | { error: number };
  getOwner(tokenId: bigint): { value: string } | { error: number };
  getTotalMinted(): { value: bigint };
  getAdmin(): { value: string };
  getAuditor(): { value: string };
  isPaused(): { value: boolean };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  auditor: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  tokenIdCounter: 0n,
  eventHandler: null,
  carbonCredits: new Map<bigint, CreditDetails>(),
  tokenOwners: new Map<bigint, string>(),
  projectVerifications: new Map<string, ProjectVerification>(),
  MAX_BATCH_MINT: 10n,

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  isAuditor(caller: string) {
    return caller === this.auditor;
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

  setAuditor(caller: string, newAuditor: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newAuditor === "SP000000000000000000002Q6VF78") return { error: 103 };
    this.auditor = newAuditor;
    return { value: true };
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  verifyProject(caller: string, projectId: string) {
    if (!this.isAuditor(caller)) return { error: 100 };
    if (projectId.length === 0) return { error: 105 };
    this.projectVerifications.set(projectId, { verified: true, auditor: caller });
    return { value: true };
  },

  mint(caller: string, recipient: string, co2Tons: bigint, projectId: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 103 };
    if (co2Tons <= 0n) return { error: 104 };
    if (projectId.length === 0) return { error: 105 };
    if (!this.projectVerifications.get(projectId)?.verified) return { error: 106 };
    if (this.paused) return { error: 104 };
    const tokenId = this.tokenIdCounter + 1n;
    this.carbonCredits.set(tokenId, { co2Tons, projectId, issuer: caller, isRetired: false, verified: true });
    this.tokenOwners.set(tokenId, recipient);
    this.tokenIdCounter = tokenId;
    return { value: tokenId };
  },

  batchMint(caller: string, recipients: string[], co2TonsList: bigint[], projectId: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (recipients.length > Number(this.MAX_BATCH_MINT)) return { error: 107 };
    if (recipients.length !== co2TonsList.length) return { error: 104 };
    if (projectId.length === 0) return { error: 105 };
    if (!this.projectVerifications.get(projectId)?.verified) return { error: 106 };
    if (this.paused) return { error: 104 };
    let currentId = this.tokenIdCounter;
    for (let i = 0; i < recipients.length; i++) {
      if (recipients[i] === "SP000000000000000000002Q6VF78") return { error: 103 };
      if (co2TonsList[i] <= 0n) return { error: 104 };
      currentId += 1n;
      this.carbonCredits.set(currentId, { co2Tons: co2TonsList[i], projectId, issuer: caller, isRetired: false, verified: true });
      this.tokenOwners.set(currentId, recipients[i]);
    }
    this.tokenIdCounter = currentId;
    return { value: currentId };
  },

  transfer(caller: string, tokenId: bigint, recipient: string) {
    if (this.paused) return { error: 104 };
    if (this.tokenOwners.get(tokenId) !== caller) return { error: 100 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 103 };
    const credit = this.carbonCredits.get(tokenId);
    if (!credit) return { error: 101 };
    if (credit.isRetired) return { error: 102 };
    this.tokenOwners.set(tokenId, recipient);
    return { value: true };
  },

  retire(caller: string, tokenId: bigint) {
    if (this.paused) return { error: 104 };
    if (this.tokenOwners.get(tokenId) !== caller) return { error: 100 };
    const credit = this.carbonCredits.get(tokenId);
    if (!credit) return { error: 101 };
    if (credit.isRetired) return { error: 102 };
    this.carbonCredits.set(tokenId, { ...credit, isRetired: true });
    return { value: true };
  },

  getCreditDetails(tokenId: bigint) {
    const credit = this.carbonCredits.get(tokenId);
    return credit ? { value: credit } : { error: 101 };
  },

  getOwner(tokenId: bigint) {
    const owner = this.tokenOwners.get(tokenId);
    return owner ? { value: owner } : { error: 101 };
  },

  getTotalMinted() {
    return { value: this.tokenIdCounter };
  },

  getAdmin() {
    return { value: this.admin };
  },

  getAuditor() {
    return { value: this.auditor };
  },

  isPaused() {
    return { value: this.paused };
  },
};

describe("CarbonCreditNFT Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.auditor = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.tokenIdCounter = 0n;
    mockContract.eventHandler = null;
    mockContract.carbonCredits = new Map();
    mockContract.tokenOwners = new Map();
    mockContract.projectVerifications = new Map();
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

    it("should allow admin to set auditor", () => {
      const result = mockContract.setAuditor(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: true });
      expect(mockContract.auditor).toBe("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
    });

    it("should prevent non-admin from setting auditor", () => {
      const result = mockContract.setAuditor("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent setting auditor to zero address", () => {
      const result = mockContract.setAuditor(mockContract.admin, "SP000000000000000000002Q6VF78");
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

  describe("Project Verification", () => {
    it("should allow auditor to verify project", () => {
      const result = mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      expect(result).toEqual({ value: true });
      expect(mockContract.projectVerifications.get("PROJECT1")).toEqual({ verified: true, auditor: mockContract.auditor });
    });

    it("should prevent non-auditor from verifying project", () => {
      const result = mockContract.verifyProject("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "PROJECT1");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent verifying empty project ID", () => {
      const result = mockContract.verifyProject(mockContract.auditor, "");
      expect(result).toEqual({ error: 105 });
    });
  });

  describe("Minting", () => {
    it("should mint a single NFT", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const result = mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      expect(result).toEqual({ value: 1n });
      expect(mockContract.tokenOwners.get(1n)).toBe("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(mockContract.carbonCredits.get(1n)).toEqual({
        co2Tons: 1000n,
        projectId: "PROJECT1",
        issuer: mockContract.admin,
        isRetired: false,
        verified: true,
      });
      expect(mockContract.tokenIdCounter).toBe(1n);
    });

    it("should prevent minting by non-admin", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const result = mockContract.mint("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1000n, "PROJECT1");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent minting to zero address", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const result = mockContract.mint(mockContract.admin, "SP000000000000000000002Q6VF78", 1000n, "PROJECT1");
      expect(result).toEqual({ error: 103 });
    });

    it("should prevent minting with invalid CO2 amount", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const result = mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 0n, "PROJECT1");
      expect(result).toEqual({ error: 104 });
    });

    it("should prevent minting with empty project ID", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const result = mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "");
      expect(result).toEqual({ error: 105 });
    });

    it("should prevent minting with unverified project", () => {
      const result = mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT2");
      expect(result).toEqual({ error: 106 });
    });

    it("should prevent minting when paused", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      expect(result).toEqual({ error: 104 });
    });

    it("should batch mint NFTs", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const recipients = ["ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB"];
      const co2TonsList = [1000n, 2000n];
      const result = mockContract.batchMint(mockContract.admin, recipients, co2TonsList, "PROJECT1");
      expect(result).toEqual({ value: 2n });
      expect(mockContract.tokenOwners.get(1n)).toBe("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(mockContract.tokenOwners.get(2n)).toBe("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(mockContract.carbonCredits.get(1n)?.co2Tons).toBe(1000n);
      expect(mockContract.carbonCredits.get(2n)?.co2Tons).toBe(2000n);
      expect(mockContract.tokenIdCounter).toBe(2n);
    });

    it("should prevent batch minting with too many recipients", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const recipients = new Array(11).fill("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      const co2TonsList = new Array(11).fill(1000n);
      const result = mockContract.batchMint(mockContract.admin, recipients, co2TonsList, "PROJECT1");
      expect(result).toEqual({ error: 107 });
    });

    it("should prevent batch minting with mismatched lists", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const recipients = ["ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB"];
      const co2TonsList = [1000n];
      const result = mockContract.batchMint(mockContract.admin, recipients, co2TonsList, "PROJECT1");
      expect(result).toEqual({ error: 104 });
    });

    it("should prevent batch minting with zero address", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const recipients = ["SP000000000000000000002Q6VF78", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB"];
      const co2TonsList = [1000n, 2000n];
      const result = mockContract.batchMint(mockContract.admin, recipients, co2TonsList, "PROJECT1");
      expect(result).toEqual({ error: 103 });
    });

    it("should prevent batch minting with invalid CO2 amounts", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      const recipients = ["ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB"];
      const co2TonsList = [1000n, 0n];
      const result = mockContract.batchMint(mockContract.admin, recipients, co2TonsList, "PROJECT1");
      expect(result).toEqual({ error: 104 });
    });
  });

  describe("Transfer and Retirement", () => {
    it("should transfer NFT", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      const result = mockContract.transfer("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n, "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ value: true });
      expect(mockContract.tokenOwners.get(1n)).toBe("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
    });

    it("should prevent transfer by non-owner", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      const result = mockContract.transfer("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent transfer to zero address", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      const result = mockContract.transfer("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n, "SP000000000000000000002Q6VF78");
      expect(result).toEqual({ error: 103 });
    });

    it("should prevent transfer of retired NFT", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      mockContract.retire("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n);
      const result = mockContract.transfer("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n, "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 102 });
    });

    it("should prevent transfer when paused", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.transfer("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n, "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 104 });
    });

    it("should retire NFT", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      const result = mockContract.retire("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n);
      expect(result).toEqual({ value: true });
      expect(mockContract.carbonCredits.get(1n)?.isRetired).toBe(true);
    });

    it("should prevent retiring already retired NFT", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      mockContract.retire("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n);
      const result = mockContract.retire("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n);
      expect(result).toEqual({ error: 102 });
    });

    it("should prevent non-owner from retiring NFT", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      const result = mockContract.retire("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent retiring when paused", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.retire("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1n);
      expect(result).toEqual({ error: 104 });
    });
  });

  describe("Read-Only Functions", () => {
    it("should get credit details", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      const result = mockContract.getCreditDetails(1n);
      expect(result).toEqual({
        value: {
          co2Tons: 1000n,
          projectId: "PROJECT1",
          issuer: mockContract.admin,
          isRetired: false,
          verified: true,
        },
      });
    });

    it("should return error for non-existent credit details", () => {
      const result = mockContract.getCreditDetails(1n);
      expect(result).toEqual({ error: 101 });
    });

    it("should get owner", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      const result = mockContract.getOwner(1n);
      expect(result).toEqual({ value: "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH" });
    });

    it("should return error for non-existent owner", () => {
      const result = mockContract.getOwner(1n);
      expect(result).toEqual({ error: 101 });
    });

    it("should get total minted", () => {
      mockContract.verifyProject(mockContract.auditor, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n, "PROJECT1");
      mockContract.mint(mockContract.admin, "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 2000n, "PROJECT1");
      const result = mockContract.getTotalMinted();
      expect(result).toEqual({ value: 2n });
    });

    it("should get admin", () => {
      const result = mockContract.getAdmin();
      expect(result).toEqual({ value: mockContract.admin });
    });

    it("should get auditor", () => {
      const result = mockContract.getAuditor();
      expect(result).toEqual({ value: mockContract.auditor });
    });

    it("should check if paused", () => {
      let result = mockContract.isPaused();
      expect(result).toEqual({ value: false });

      mockContract.setPaused(mockContract.admin, true);
      result = mockContract.isPaused();
      expect(result).toEqual({ value: true });
    });
  });
});