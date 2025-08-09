# CarbonFlow

A blockchain-powered carbon credit marketplace that enables transparent issuance, trading, and retirement of tokenized carbon credits, incentivizing climate action with trust and efficiency — all on-chain.

---

## Overview

CarbonFlow is a decentralized platform built on the Stacks blockchain to address inefficiencies in carbon credit markets, such as lack of transparency, fraud, and high intermediary costs. It connects carbon offset project developers with buyers (corporations, individuals) through a secure, automated ecosystem powered by smart contracts.

The platform consists of five main smart contracts:

1. **CarbonCreditNFT Contract** – Issues and manages tokenized carbon credits as non-fungible tokens (NFTs).
2. **CarbonMarketplace Contract** – Facilitates the listing, buying, and selling of carbon credits.
3. **CarbonToken Contract** – Manages the native CARB token for payments and rewards.
4. **ProjectVerification Contract** – Handles verification of carbon offset projects by certified auditors.
5. **IncentivePool Contract** – Distributes token rewards to users for retiring credits.

---

## Features

- **Tokenized carbon credits** as NFTs for unique tracking and ownership  
- **Decentralized marketplace** for transparent credit trading  
- **Native CARB token** for payments and incentives  
- **Auditor-verified projects** to ensure credit authenticity  
- **Automated rewards** for retiring credits to support climate action  
- **Immutable ledger** to prevent double-counting and fraud  
- **Scalable design** leveraging Stacks’ Bitcoin-secured blockchain  
- **Transparent fund allocation** for project developers and buyers  

---

## Smart Contracts

### CarbonCreditNFT Contract
- Mints carbon credits as NFTs with metadata (CO2 tons, project ID)
- Tracks credit retirement status
- Enforces ownership rules for transfers and retirement

### CarbonMarketplace Contract
- Lists carbon credit NFTs for sale
- Automates credit purchases with CARB token payments
- Transfers ownership securely with anti-fraud measures

### CarbonToken Contract
- Issues and manages CARB tokens (fungible)
- Supports minting for authorized entities
- Facilitates payments and rewards across the platform

### ProjectVerification Contract
- Manages auditor registration and permissions
- Verifies carbon offset projects for authenticity
- Logs verified project details on-chain

### IncentivePool Contract
- Distributes CARB token rewards for retired credits
- Allows reward rate updates by authorized entities
- Tracks reward distribution history

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started) for Stacks development.
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/carbonflow.git
   ```
3. Navigate to the project directory:
   ```bash
   cd carbonflow
   ```
4. Run tests:
   ```bash
   clarinet test
   ```
5. Deploy contracts to a Stacks testnet or mainnet:
   ```bash
   clarinet deploy
   ```

---

## Usage

Each smart contract is designed to operate independently while integrating seamlessly to form the CarbonFlow ecosystem. Key interactions include:
- Project developers submit projects for verification via the **ProjectVerification Contract**.
- Verified projects mint carbon credits as NFTs using the **CarbonCreditNFT Contract**.
- Credits are listed and traded on the **CarbonMarketplace Contract** using **CarbonToken**.
- Buyers retire credits, triggering rewards from the **IncentivePool Contract**.

Refer to individual contract documentation in the `/contracts` folder for detailed function calls, parameters, and usage examples.

---

## License

MIT License
