export const bountyBoardAbi = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "reward", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "description", "type": "string" }
    ],
    "name": "BountyCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "solver", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "reward", "type": "uint256" }
    ],
    "name": "RewardClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "solver", "type": "address" }
    ],
    "name": "SolutionApproved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "solver", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "solution", "type": "string" }
    ],
    "name": "SolutionSubmitted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "approveSolution",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bounty",
    "outputs": [
      { "internalType": "address payable", "name": "creator", "type": "address" },
      { "internalType": "uint256", "name": "reward", "type": "uint256" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "address payable", "name": "solver", "type": "address" },
      { "internalType": "string", "name": "solution", "type": "string" },
      { "internalType": "bool", "name": "submitted", "type": "bool" },
      { "internalType": "bool", "name": "approved", "type": "bool" },
      { "internalType": "bool", "name": "paid", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bountyExists",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" }
    ],
    "name": "createBounty",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBounty",
    "outputs": [
      {
        "components": [
          { "internalType": "address payable", "name": "creator", "type": "address" },
          { "internalType": "uint256", "name": "reward", "type": "uint256" },
          { "internalType": "string", "name": "title", "type": "string" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "address payable", "name": "solver", "type": "address" },
          { "internalType": "string", "name": "solution", "type": "string" },
          { "internalType": "bool", "name": "submitted", "type": "bool" },
          { "internalType": "bool", "name": "approved", "type": "bool" },
          { "internalType": "bool", "name": "paid", "type": "bool" }
        ],
        "internalType": "struct BountyBoard.Bounty",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_solution", "type": "string" }
    ],
    "name": "submitSolution",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Preserve Greeter ABI for backwards compatibility
export const greeterAbi = [
  {
    "inputs": [{"internalType": "string", "name": "_greeting", "type": "string"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "greet",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_greeting", "type": "string"}],
    "name": "setGreeting",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
