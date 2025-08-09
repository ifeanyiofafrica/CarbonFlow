import { describe, it, expect, beforeEach, vi } from "vitest";

interface StakeDetails {
  startBlock: bigint;
  duration: bigint;
}

interface MockContract {
  admin: string;
  paused: boolean;
  rewardRate: bigint;
  rewardFund: bigint;
  minStakeDuration: bigint;
  maxStakeDuration: bigint;
  stakes: Map<string, StakeDetails>;
  approvedNftContracts: Map<string, boolean>;
  rewards: Map<string, bigint>;
  isAdmin(caller: string): boolean;
  setAdmin(caller: string, newAdmin: string): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  setRewardRate(caller: string, rate: bigint): { value: boolean } | { error: number };
  fundRewardPool(caller: string, amount: bigint, callerBalance: bigint): { value: boolean } | { error: number };
  approveNftContract(caller: string, nftContract: string): { value: boolean } | { error: number };
  setMinStakeDuration(caller: string, duration: bigint): { value: boolean } | { error: number };
  setMaxStakeDuration(caller: string, duration: bigint): { value: boolean } | { error: number };
  stakeNft(caller: string, tokenId: bigint, nftContract: string, duration: bigint): { value: boolean } | { error: number };
  unstakeNft(caller: string, tokenId: bigint, nftContract: string, currentBlock: bigint): { value: boolean } | { error: number };
  getStakeDetails(user: string, tokenId: bigint, nftContract: string): { value: StakeDetails } | { error: number };
  getRewardAmount(user: string, tokenId: bigint, nftContract: string): { value: bigint };
  getRewardFund(): { value: bigint };
  getAdmin(): { value: string };
  isPaused(): { value: boolean };
  getRewardRate(): { value: bigint };
  getMinStakeDuration(): { value: bigint };
  getMaxStakeDuration(): { value: bigint };
  isNftContractApproved(nftContract: string): { value: boolean };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  rewardRate: 100n,
  rewardFund: 0n,
  minStakeDuration: 1440n,
  maxStakeDuration: 525600n,
  stakes: new Map<string, StakeDetails>(),
  approvedNftContracts: new Map<string, boolean>(),
  rewards: new Map<string, bigint>(),

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

  setRewardRate(caller: string, rate: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (rate <= 0n || rate > 10000n) return { error: 104 };
    this.rewardRate = rate;
    return { value: true };
  },

  fundRewardPool(caller: string, amount: bigint, callerBalance: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (amount <= 0n) return { error: 104 };
    if (callerBalance < amount) return { error: 107 };
    this.rewardFund += amount;
    return { value: true };
  },

  approveNftContract(caller: string, nftContract: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (nftContract === "SP000000000000000000002Q6VF78") return { error: 103 };
    this.approvedNftContracts.set(nftContract, true);
    return { value: true };
  },

  setMinStakeDuration(caller: string, duration: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (duration <= 0n || duration > this.maxStakeDuration) return { error: 108 };
    this.minStakeDuration = duration;
    return { value: true };
  },

  setMaxStakeDuration(caller: string, duration: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (duration < this.minStakeDuration) return { error: 108 };
    this.maxStakeDuration = duration;
    return { value: true };
  },

  stakeNft(caller: string, tokenId: bigint, nftContract: string, duration: bigint) {
    if (this.paused) return { error: 105 };
    if (!this.approvedNftContracts.get(nftContract)) return { error: 109 };
    const stakeKey = `${caller}-${tokenId}-${nftContract}`;
    if (this.stakes.has(stakeKey)) return { error: 102 };
    if (duration < this.minStakeDuration || duration > this.maxStakeDuration) return { error: 108 };
    this.stakes.set(stakeKey, { startBlock: 1000n, duration });
    return { value: true };
  },

  unstakeNft(caller: string, tokenId: bigint, nftContract: string, currentBlock: bigint) {
    if (this.paused) return { error: 105 };
    const stakeKey = `${caller}-${tokenId}-${nftContract}`;
    const stake = this.stakes.get(stakeKey);
    if (!stake) return { error: 106 };
    const blocksStaked = currentBlock - stake.startBlock;
    if (blocksStaked < stake.duration) return { error: 108 };
    const rewardAmount = (blocksStaked * this.rewardRate) / 10000n;
    if (rewardAmount > this.rewardFund) return { error: 107 };
    this.stakes.delete(stakeKey);
    this.rewards.set(stakeKey, rewardAmount);
    this.rewardFund -= rewardAmount;
    return { value: true };
  },

  getStakeDetails(user: string, tokenId: bigint, nftContract: string) {
    const stakeKey = `${user}-${tokenId}-${nftContract}`;
    const stake = this.stakes.get(stakeKey);
    return stake ? { value: stake } : { error: 106 };
  },

  getRewardAmount(user: string, tokenId: bigint, nftContract: string) {
    const stakeKey = `${user}-${tokenId}-${nftContract}`;
    return { value: this.rewards.get(stakeKey) || 0n };
  },

  getRewardFund() {
    return { value: this.rewardFund };
  },

  getAdmin() {
    return { value: this.admin };
  },

  isPaused() {
    return { value: this.paused };
  },

  getRewardRate() {
    return { value: this.rewardRate };
  },

  getMinStakeDuration() {
    return { value: this.minStakeDuration };
  },

  getMaxStakeDuration() {
    return { value: this.maxStakeDuration };
  },

  isNftContractApproved(nftContract: string) {
    return { value: this.approvedNftContracts.get(nftContract) || false };
  },
};

describe("CarbonCreditStaking Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.rewardRate = 100n;
    mockContract.rewardFund = 0n;
    mockContract.minStakeDuration = 1440n;
    mockContract.maxStakeDuration = 525600n;
    mockContract.stakes = new Map();
    mockContract.approvedNftContracts = new Map();
    mockContract.rewards = new Map();
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

    it("should allow admin to set reward rate", () => {
      const result = mockContract.setRewardRate(mockContract.admin, 200n);
      expect(result).toEqual({ value: true });
      expect(mockContract.rewardRate).toBe(200n);
    });

    it("should prevent non-admin from setting reward rate", () => {
      const result = mockContract.setRewardRate("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 200n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent setting invalid reward rate", () => {
      const resultZero = mockContract.setRewardRate(mockContract.admin, 0n);
      expect(resultZero).toEqual({ error: 104 });

      const resultHigh = mockContract.setRewardRate(mockContract.admin, 15000n);
      expect(resultHigh).toEqual({ error: 104 });
    });

    it("should allow admin to fund reward pool", () => {
      const result = mockContract.fundRewardPool(mockContract.admin, 1000000n, 2000000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.rewardFund).toBe(1000000n);
    });

    it("should prevent non-admin from funding reward pool", () => {
      const result = mockContract.fundRewardPool("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000000n, 2000000n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent funding with zero amount", () => {
      const result = mockContract.fundRewardPool(mockContract.admin, 0n, 2000000n);
      expect(result).toEqual({ error: 104 });
    });

    it("should prevent funding with insufficient balance", () => {
      const result = mockContract.fundRewardPool(mockContract.admin, 1000000n, 500000n);
      expect(result).toEqual({ error: 107 });
    });

    it("should allow admin to approve NFT contract", () => {
      const result = mockContract.approveNftContract(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: true });
      expect(mockContract.approvedNftContracts.get("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH")).toBe(true);
    });

    it("should prevent non-admin from approving NFT contract", () => {
      const result = mockContract.approveNftContract("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB");
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent approving zero address as NFT contract", () => {
      const result = mockContract.approveNftContract(mockContract.admin, "SP000000000000000000002Q6VF78");
      expect(result).toEqual({ error: 103 });
    });

    it("should allow admin to set min stake duration", () => {
      const result = mockContract.setMinStakeDuration(mockContract.admin, 2000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.minStakeDuration).toBe(2000n);
    });

    it("should prevent non-admin from setting min stake duration", () => {
      const result = mockContract.setMinStakeDuration("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent setting invalid min stake duration", () => {
      const resultZero = mockContract.setMinStakeDuration(mockContract.admin, 0n);
      expect(resultZero).toEqual({ error: 108 });

      const resultHigh = mockContract.setMinStakeDuration(mockContract.admin, 600000n);
      expect(resultHigh).toEqual({ error: 108 });
    });

    it("should allow admin to set max stake duration", () => {
      const result = mockContract.setMaxStakeDuration(mockContract.admin, 600000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.maxStakeDuration).toBe(600000n);
    });

    it("should prevent non-admin from setting max stake duration", () => {
      const result = mockContract.setMaxStakeDuration("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 600000n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent setting invalid max stake duration", () => {
      mockContract.setMinStakeDuration(mockContract.admin, 2000n);
      const result = mockContract.setMaxStakeDuration(mockContract.admin, 1000n);
      expect(result).toEqual({ error: 108 });
    });
  });

  describe("Staking Operations", () => {
    beforeEach(() => {
      mockContract.approveNftContract(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      mockContract.fundRewardPool(mockContract.admin, 1000000n, 2000000n);
    });

    it("should stake NFT successfully", () => {
      const result = mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      expect(result).toEqual({ value: true });
      const stakeKey = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB-1-ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH";
      expect(mockContract.stakes.get(stakeKey)).toEqual({ startBlock: 1000n, duration: 2000n });
    });

    it("should prevent staking when paused", () => {
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      expect(result).toEqual({ error: 105 });
    });

    it("should prevent staking with unapproved NFT contract", () => {
      const result = mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 2000n);
      expect(result).toEqual({ error: 109 });
    });

    it("should prevent staking already staked NFT", () => {
      mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      const result = mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      expect(result).toEqual({ error: 102 });
    });

    it("should prevent staking with invalid duration", () => {
      const resultLow = mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 1000n);
      expect(resultLow).toEqual({ error: 108 });

      const resultHigh = mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 600000n);
      expect(resultHigh).toEqual({ error: 108 });
    });

    it("should unstake NFT and claim rewards", () => {
      mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      const result = mockContract.unstakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 3000n);
      expect(result).toEqual({ value: true });
      const stakeKey = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB-1-ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH";
      expect(mockContract.stakes.has(stakeKey)).toBe(false);
      expect(mockContract.rewards.get(stakeKey)).toBe(20n); // (3000 - 1000) * 100 / 10000
      expect(mockContract.rewardFund).toBe(999980n);
    });

    it("should prevent unstaking when paused", () => {
      mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.unstakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 3000n);
      expect(result).toEqual({ error: 105 });
    });

    it("should prevent unstaking non-staked NFT", () => {
      const result = mockContract.unstakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 3000n);
      expect(result).toEqual({ error: 106 });
    });

    it("should prevent unstaking before duration", () => {
      mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      const result = mockContract.unstakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      expect(result).toEqual({ error: 108 });
    });

    it("should prevent unstaking with insufficient reward fund", () => {
      mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      mockContract.rewardFund = 10n;
      const result = mockContract.unstakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 3000n);
      expect(result).toEqual({ error: 107 });
    });
  });

  describe("Read-Only Functions", () => {
    beforeEach(() => {
      mockContract.approveNftContract(mockContract.admin, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      mockContract.fundRewardPool(mockContract.admin, 1000000n, 2000000n);
    });

    it("should get stake details", () => {
      mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      const result = mockContract.getStakeDetails("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: { startBlock: 1000n, duration: 2000n } });
    });

    it("should return error for non-staked NFT", () => {
      const result = mockContract.getStakeDetails("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ error: 106 });
    });

    it("should get reward amount", () => {
      mockContract.stakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000n);
      mockContract.unstakeNft("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 3000n);
      const result = mockContract.getRewardAmount("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: 20n });
    });

    it("should return zero for non-existent reward", () => {
      const result = mockContract.getRewardAmount("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB", 1n, "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH");
      expect(result).toEqual({ value: 0n });
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

    it("should get reward rate", () => {
      const result = mockContract.getRewardRate();
      expect(result).toEqual({ value: 100n });
    });

    it("should get min stake duration", () => {
      const result = mockContract.getMinStakeDuration();
      expect(result).toEqual({ value: 1440n });
    });

    it("should get max stake duration", () => {
      const result = mockContract.getMaxStakeDuration();
      expect(result).toEqual({ value: 525600n });
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