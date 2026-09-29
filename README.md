# BountyBoard dApp (Monad Testnet) 🚀

A modern Web3 decentralized Bounty Board application built with Next.js, Tailwind CSS, Wagmi v2, Viem, and Hardhat v2, running on **Monad Testnet** (Chain ID: `10143`).

The smart contract acts as a trustless escrow that holds native MON tokens as hackathon bounty rewards and releases them directly upon organizer review and approval.

---

## 🎯 MVP Hackathon Flow

1. **Organizer Creates Bounty**:
   - Sets title, description, and reward amount in MON.
   - Reward MON tokens are deposited with the transaction and held safely in contract escrow.
2. **Participant Views Bounty**:
   - Sees the bounty details, reward in MON, creator address, and live status.
3. **Participant Submits Solution**:
   - Submits a GitHub repository or project link stored directly on-chain.
4. **Organizer Approves Solution**:
   - Only the bounty creator can approve the submitted solution.
5. **Participant Claims Reward**:
   - The approved solver triggers `claimReward()`, and the contract safely transfers the locked MON escrow directly to the solver.

---

## 🛠️ Local Setup & Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create or update your `.env` file:
```env
# Your EVM Wallet Private Key (for deploying contracts)
PRIVATE_KEY=your_private_key_here

# Deployed BountyBoard smart contract address
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address_here
```

### 3. Run Automated Smart Contract Tests
Run the comprehensive Hardhat test suite verifying the full bounty lifecycle, permissions, and escrow payouts:
```bash
npx hardhat test
```

### 4. Deploy BountyBoard to Monad Testnet
Compile and deploy the `BountyBoard` contract using Hardhat Ignition:
```bash
npx hardhat compile
npx hardhat ignition deploy ignition/modules/BountyBoard.ts --network monadTestnet
```
*Note: Ensure your `PRIVATE_KEY` wallet has testnet MON to cover deployment gas.*

Copy the deployed contract address and paste it into your `.env` as `NEXT_PUBLIC_CONTRACT_ADDRESS`.

### 5. Run the Frontend
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🦊 Monad Testnet Configuration
- **Network Name**: Monad Testnet
- **Chain ID**: `10143`
- **Currency**: `MON`
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Explorer**: `https://testnet.monadexplorer.com`
