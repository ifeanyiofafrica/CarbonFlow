import { describe, it, expect, beforeEach } from "vitest";

interface ProposalDetails {
  proposer: string;
  description: string;
  amount: bigint;
  recipient: string;
  startBlock: bigint;
  duration: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  executed: boolean;
}

interface MockContract {
  admin: string;
  paused: boolean;
  minProposalAmount: bigint;
  proposalCount: bigint;
  proposals: Map<bigint, ProposalDetails>;
  votes: Map<string, boolean>;
  isAdmin(caller: string): boolean;
  setAdmin(caller: string, newAdmin: string): { value: boolean } | { error: number };
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  setMinProposalAmount(caller: string, amount: bigint): { value: boolean } | { error: number };
  createProposal(caller: string, description: string, amount: bigint, recipient: string, duration: bigint, callerBalance: bigint, currentBlock: bigint): { value: bigint } | { error: number };
  vote(caller: string, proposalId: bigint, voteYes: boolean, currentBlock: bigint): { value: boolean } | { error: number };
  executeProposal(caller: string, proposalId: bigint, currentBlock: bigint): { value: boolean } | { error: number };
  getProposal(proposalId: bigint): { value: ProposalDetails } | { error: number };
  getVote(proposalId: bigint, voter: string): { value: boolean } | { error: number };
  getAdmin(): { value: string };
  isPaused(): { value: boolean };
  getMinProposalAmount(): { value: bigint };
  getProposalCount(): { value: bigint };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  minProposalAmount: 1000000n,
  proposalCount: 0n,
  proposals: new Map<bigint, ProposalDetails>(),
  votes: new Map<string, boolean>(),

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  setAdmin(caller: string, newAdmin: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newAdmin === "SP000000000000000000002Q6VF78") return { error: 101 };
    this.admin = newAdmin;
    return { value: true };
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  setMinProposalAmount(caller: string, amount: bigint) {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (amount <= 0n) return { error: 103 };
    this.minProposalAmount = amount;
    return { value: true };
  },

  createProposal(caller: string, description: string, amount: bigint, recipient: string, duration: bigint, callerBalance: bigint, currentBlock: bigint) {
    if (this.paused) return { error: 102 };
    if (amount < this.minProposalAmount) return { error: 103 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 101 };
    if (duration < 1440n || duration > 525600n) return { error: 109 };
    if (callerBalance < amount) return { error: 103 };
    const proposalId = this.proposalCount;
    this.proposals.set(proposalId, {
      proposer: caller,
      description,
      amount,
      recipient,
      startBlock: currentBlock,
      duration,
      yesVotes: 0n,
      noVotes: 0n,
      executed: false,
    });
    this.proposalCount += 1n;
    return { value: proposalId };
  },

  vote(caller: string, proposalId: bigint, voteYes: boolean, currentBlock: bigint) {
    if (this.paused) return { error: 102 };
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return { error: 104 };
    if (currentBlock > proposal.startBlock + proposal.duration) return { error: 106 };
    if (proposal.executed) return { error: 107 };
    const voteKey = `${proposalId}-${caller}`;
    if (this.votes.has(voteKey)) return { error: 105 };
    this.votes.set(voteKey, voteYes);
    this.proposals.set(proposalId, {
      ...proposal,
      yesVotes: voteYes ? proposal.yesVotes + 1n : proposal.yesVotes,
      noVotes: voteYes ? proposal.noVotes : proposal.noVotes + 1n,
    });
    return { value: true };
  },

  executeProposal(caller: string, proposalId: bigint, currentBlock: bigint) {
    if (this.paused) return { error: 102 };
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return { error: 104 };
    if (currentBlock <= proposal.startBlock + proposal.duration) return { error: 106 };
    if (proposal.executed) return { error: 107 };
    if (proposal.yesVotes <= proposal.noVotes) return { error: 108 };
    this.proposals.set(proposalId, { ...proposal, executed: true });
    return { value: true };
  },

  getProposal(proposalId: bigint) {
    const proposal = this.proposals.get(proposalId);
    return proposal ? { value: proposal } : { error: 104 };
  },

  getVote(proposalId: bigint, voter: string) {
    const voteKey = `${proposalId}-${voter}`;
    const vote = this.votes.get(voteKey);
    return vote !== undefined ? { value: vote } : { error: 105 };
  },

  getAdmin() {
    return { value: this.admin };
  },

  isPaused() {
    return { value: this.paused };
  },

  getMinProposalAmount() {
    return { value: this.minProposalAmount };
  },

  getProposalCount() {
    return { value: this.proposalCount };
  },
};

describe("CarbonCreditGovernance Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.minProposalAmount = 1000000n;
    mockContract.proposalCount = 0n;
    mockContract.proposals = new Map();
    mockContract.votes = new Map();
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
      expect(result).toEqual({ error: 101 });
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

    it("should allow admin to set minimum proposal amount", () => {
      const result = mockContract.setMinProposalAmount(mockContract.admin, 2000000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.minProposalAmount).toBe(2000000n);
    });

    it("should prevent non-admin from setting minimum proposal amount", () => {
      const result = mockContract.setMinProposalAmount("ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH", 2000000n);
      expect(result).toEqual({ error: 100 });
    });

    it("should prevent setting zero minimum proposal amount", () => {
      const result = mockContract.setMinProposalAmount(mockContract.admin, 0n);
      expect(result).toEqual({ error: 103 });
    });
  });

  describe("Proposal Operations", () => {
    it("should create proposal successfully", () => {
      const result = mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      expect(result).toEqual({ value: 0n });
      expect(mockContract.proposals.get(0n)).toEqual({
        proposer: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        description: "Test proposal",
        amount: 2000000n,
        recipient: "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        startBlock: 1000n,
        duration: 2000n,
        yesVotes: 0n,
        noVotes: 0n,
        executed: false,
      });
      expect(mockContract.proposalCount).toBe(1n);
    });

    it("should prevent creating proposal when paused", () => {
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      expect(result).toEqual({ error: 102 });
    });

    it("should prevent creating proposal with insufficient amount", () => {
      const result = mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        500000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      expect(result).toEqual({ error: 103 });
    });

    it("should prevent creating proposal with zero address recipient", () => {
      const result = mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "SP000000000000000000002Q6VF78",
        2000n,
        3000000n,
        1000n
      );
      expect(result).toEqual({ error: 101 });
    });

    it("should prevent creating proposal with invalid duration", () => {
      const resultLow = mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        1000n,
        3000000n,
        1000n
      );
      expect(resultLow).toEqual({ error: 109 });

      const resultHigh = mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        600000n,
        3000000n,
        1000n
      );
      expect(resultHigh).toEqual({ error: 109 });
    });

    it("should prevent creating proposal with insufficient balance", () => {
      const result = mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        1000000n,
        1000n
      );
      expect(result).toEqual({ error: 103 });
    });

    it("should allow voting on proposal", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      const result = mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      expect(result).toEqual({ value: true });
      expect(mockContract.votes.get("0-ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0")).toBe(true);
      expect(mockContract.proposals.get(0n)?.yesVotes).toBe(1n);
    });

    it("should prevent voting when paused", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      expect(result).toEqual({ error: 102 });
    });

    it("should prevent voting on non-existent proposal", () => {
      const result = mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      expect(result).toEqual({ error: 104 });
    });

    it("should prevent voting after voting period", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      const result = mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 4000n);
      expect(result).toEqual({ error: 106 });
    });

    it("should prevent voting on executed proposal", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      mockContract.executeProposal("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, 4000n);
      const result = mockContract.vote("ST5TKP3V80D0Z6W2H3K0W2H3K0W2H3K0W2H3K0W2", 0n, true, 1500n);
      expect(result).toEqual({ error: 107 });
    });

    it("should prevent double voting", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      const result = mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, false, 1500n);
      expect(result).toEqual({ error: 105 });
    });

    it("should execute proposal successfully", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      const result = mockContract.executeProposal("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, 4000n);
      expect(result).toEqual({ value: true });
      expect(mockContract.proposals.get(0n)?.executed).toBe(true);
    });

    it("should prevent executing proposal when paused", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.setPaused(mockContract.admin, true);
      const result = mockContract.executeProposal("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, 4000n);
      expect(result).toEqual({ error: 102 });
    });

    it("should prevent executing non-existent proposal", () => {
      const result = mockContract.executeProposal("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, 4000n);
      expect(result).toEqual({ error: 104 });
    });

    it("should prevent executing proposal before voting period ends", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      const result = mockContract.executeProposal("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, 1500n);
      expect(result).toEqual({ error: 106 });
    });

    it("should prevent executing already executed proposal", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      mockContract.executeProposal("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, 4000n);
      const result = mockContract.executeProposal("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, 4000n);
      expect(result).toEqual({ error: 107 });
    });

    it("should prevent executing proposal with insufficient yes votes", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, false, 1500n);
      const result = mockContract.executeProposal("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, 4000n);
      expect(result).toEqual({ error: 108 });
    });
  });

  describe("Read-Only Functions", () => {
    it("should get proposal details", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      const result = mockContract.getProposal(0n);
      expect(result).toEqual({
        value: {
          proposer: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
          description: "Test proposal",
          amount: 2000000n,
          recipient: "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
          startBlock: 1000n,
          duration: 2000n,
          yesVotes: 0n,
          noVotes: 0n,
          executed: false,
        },
      });
    });

    it("should return error for non-existent proposal", () => {
      const result = mockContract.getProposal(0n);
      expect(result).toEqual({ error: 104 });
    });

    it("should get vote details", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      mockContract.vote("ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0", 0n, true, 1500n);
      const result = mockContract.getVote(0n, "ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0");
      expect(result).toEqual({ value: true });
    });

    it("should return error for non-existent vote", () => {
      const result = mockContract.getVote(0n, "ST4RE0B1F65TKP3V80D0Z6W2H3K0W2H3K0W2H3K0");
      expect(result).toEqual({ error: 105 });
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

    it("should get minimum proposal amount", () => {
      const result = mockContract.getMinProposalAmount();
      expect(result).toEqual({ value: 1000000n });
    });

    it("should get proposal count", () => {
      mockContract.createProposal(
        "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N3YRN6AB",
        "Test proposal",
        2000000n,
        "ST2CY5V39QN1H0J7F3N3VRZQH0W2CBB0W2N3VRZQH",
        2000n,
        3000000n,
        1000n
      );
      const result = mockContract.getProposalCount();
      expect(result).toEqual({ value: 1n });
    });
  });
});