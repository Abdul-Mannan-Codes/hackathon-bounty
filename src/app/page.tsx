'use client';

import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { formatEther, parseEther, formatUnits } from 'viem';
import { bountyBoardAbi } from '../lib/abi';
import { monadTestnet } from '../lib/config';

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: isConnectPending } = useConnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  const mounted = useMounted();
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Form states
  const [titleInput, setTitleInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [rewardInput, setRewardInput] = useState('');
  const [solutionInput, setSolutionInput] = useState('');
  const [activeAction, setActiveAction] = useState<'create' | 'submit' | 'approve' | 'claim' | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const isAddressConfigured = Boolean(contractAddress && contractAddress.startsWith('0x') && contractAddress.length === 42);

  // Fetch native balance
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
  });

  // Read bounty exists status
  const { data: bountyExistsData, refetch: refetchBountyExists } = useReadContract({
    address: contractAddress,
    abi: bountyBoardAbi,
    functionName: 'bountyExists',
    query: {
      enabled: isAddressConfigured,
      refetchInterval: 5000,
    },
  });

  // Read bounty data
  const {
    data: rawBountyData,
    refetch: refetchBounty,
  } = useReadContract({
    address: contractAddress,
    abi: bountyBoardAbi,
    functionName: 'getBounty',
    query: {
      enabled: isAddressConfigured,
      refetchInterval: 5000,
    },
  });

  type RawBountyTuple = readonly [
    creator: `0x${string}`,
    reward: bigint,
    title: string,
    description: string,
    solver: `0x${string}`,
    solution: string,
    submitted: boolean,
    approved: boolean,
    paid: boolean
  ];

  type RawBountyObject = {
    creator?: `0x${string}`;
    reward?: bigint;
    title?: string;
    description?: string;
    solver?: `0x${string}`;
    solution?: string;
    submitted?: boolean;
    approved?: boolean;
    paid?: boolean;
  };

  const rawObj = rawBountyData as RawBountyObject | undefined;
  const rawTuple = rawBountyData as unknown as RawBountyTuple | undefined;

  // Normalize bounty data (handles both array and object returns from viem)
  const bounty = rawBountyData
    ? {
        creator: (rawObj?.creator ?? rawTuple?.[0] ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
        reward: (rawObj?.reward ?? rawTuple?.[1] ?? BigInt(0)) as bigint,
        title: (rawObj?.title ?? rawTuple?.[2] ?? '') as string,
        description: (rawObj?.description ?? rawTuple?.[3] ?? '') as string,
        solver: (rawObj?.solver ?? rawTuple?.[4] ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
        solution: (rawObj?.solution ?? rawTuple?.[5] ?? '') as string,
        submitted: Boolean(rawObj?.submitted ?? rawTuple?.[6]),
        approved: Boolean(rawObj?.approved ?? rawTuple?.[7]),
        paid: Boolean(rawObj?.paid ?? rawTuple?.[8]),
      }
    : null;

  const hasBounty =
    Boolean(bountyExistsData) &&
    Boolean(bounty?.creator) &&
    bounty?.creator !== '0x0000000000000000000000000000000000000000';

  const isBountyActive = hasBounty && !bounty?.paid;
  const isBountyPaid = hasBounty && Boolean(bounty?.paid);

  // Role checks
  const isCreator =
    Boolean(isConnected && address && bounty?.creator && address.toLowerCase() === bounty.creator.toLowerCase());
  const isSolver =
    Boolean(isConnected && address && bounty?.solver && address.toLowerCase() === bounty.solver.toLowerCase());
  const isWrongNetwork = Boolean(isConnected && chainId !== monadTestnet.id);

  // Contract write actions
  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });

  // Refresh upon confirmation
  useEffect(() => {
    if (isConfirmed) {
      refetchBounty();
      refetchBountyExists();
      refetchBalance();
      const timer = setTimeout(() => {
        if (activeAction === 'create') {
          setTitleInput('');
          setDescriptionInput('');
          setRewardInput('');
        } else if (activeAction === 'submit') {
          setSolutionInput('');
        }
        setActiveAction(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, refetchBounty, refetchBountyExists, refetchBalance, activeAction]);

  const ensureNetwork = () => {
    if (isWrongNetwork && switchChain) {
      switchChain({ chainId: monadTestnet.id });
      return false;
    }
    return true;
  };

  const handleCreateBounty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress || !ensureNetwork() || !titleInput || !descriptionInput || !rewardInput) return;
    try {
      resetWrite();
      setActiveAction('create');
      writeContract({
        address: contractAddress,
        abi: bountyBoardAbi,
        functionName: 'createBounty',
        args: [titleInput.trim(), descriptionInput.trim()],
        value: parseEther(rewardInput.trim()),
        chainId: monadTestnet.id,
      });
    } catch (err) {
      console.error('Error creating bounty:', err);
    }
  };

  const handleSubmitSolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress || !ensureNetwork() || !solutionInput) return;
    try {
      resetWrite();
      setActiveAction('submit');
      writeContract({
        address: contractAddress,
        abi: bountyBoardAbi,
        functionName: 'submitSolution',
        args: [solutionInput.trim()],
        chainId: monadTestnet.id,
      });
    } catch (err) {
      console.error('Error submitting solution:', err);
    }
  };

  const handleApproveSolution = () => {
    if (!contractAddress || !ensureNetwork()) return;
    try {
      resetWrite();
      setActiveAction('approve');
      writeContract({
        address: contractAddress,
        abi: bountyBoardAbi,
        functionName: 'approveSolution',
        chainId: monadTestnet.id,
      });
    } catch (err) {
      console.error('Error approving solution:', err);
    }
  };

  const handleClaimReward = () => {
    if (!contractAddress || !ensureNetwork()) return;
    try {
      resetWrite();
      setActiveAction('claim');
      writeContract({
        address: contractAddress,
        abi: bountyBoardAbi,
        functionName: 'claimReward',
        chainId: monadTestnet.id,
      });
    } catch (err) {
      console.error('Error claiming reward:', err);
    }
  };

  const shortenAddress = (addr?: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-purple-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20 text-white font-black text-xl">
              ₿
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                BountyBoard
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  MVP
                </span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">Monad Testnet Escrow</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Network Indicator */}
            {isConnected ? (
              isWrongNetwork ? (
                <button
                  onClick={() => switchChain && switchChain({ chainId: monadTestnet.id })}
                  disabled={isSwitchingChain}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Switch to Monad Testnet
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden sm:inline">Monad Testnet</span>
                  <span className="sm:hidden">Monad</span>
                  <span className="text-slate-500 text-[10px] font-mono">10143</span>
                </div>
              )
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Monad Testnet (10143)
              </div>
            )}

            {/* Wallet Connect / Account Info */}
            {!isConnected ? (
              <div className="flex items-center gap-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    disabled={isConnectPending}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-violet-600/25 hover:shadow-violet-600/40 cursor-pointer disabled:opacity-50"
                  >
                    {isConnectPending ? 'Connecting...' : `Connect ${connector.name}`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs">
                  {balanceData && (
                    <span className="font-mono text-violet-300 font-semibold hidden md:inline">
                      {parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(3)} MON
                    </span>
                  )}
                  <button
                    onClick={() => copyToClipboard(address!)}
                    title="Click to copy full address"
                    className="font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedAddress ? 'Copied!' : shortenAddress(address)}
                  </button>
                </div>
                <button
                  onClick={() => disconnect()}
                  title="Disconnect wallet"
                  className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 transition-all text-xs cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full flex flex-col gap-10">
        {/* Wrong Network Warning Banner */}
        {isWrongNetwork && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-300">Wrong Network Detected</p>
                <p className="text-xs text-amber-200/80">
                  Please switch your wallet to Monad Testnet (Chain ID 10143) to interact with the BountyBoard.
                </p>
              </div>
            </div>
            <button
              onClick={() => switchChain && switchChain({ chainId: monadTestnet.id })}
              disabled={isSwitchingChain}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md"
            >
              {isSwitchingChain ? 'Switching...' : 'Switch Network'}
            </button>
          </div>
        )}

        {/* Missing Contract Address Alert */}
        {!isAddressConfigured && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-300 mb-1">Workshop Deployment Notice</p>
              <p className="text-blue-200/80 leading-relaxed mb-2">
                Smart contract address is not configured yet. Deploy BountyBoard to Monad Testnet and set{' '}
                <code className="bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs">
                  NEXT_PUBLIC_CONTRACT_ADDRESS
                </code>{' '}
                in your <code className="bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs">.env</code> file.
              </p>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-all">
                npx hardhat ignition deploy ignition/modules/BountyBoard.ts --network monadTestnet
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center flex flex-col items-center gap-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
            Trustless Escrow on Monad High-Speed EVM
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              Build. Submit.{' '}
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-300 to-emerald-400">
              Earn.
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            On-chain hackathon bounties powered by Monad. Organizers lock native MON into smart contract escrow. Solvers
            submit verifiable proof and withdraw locked rewards directly upon approval.
          </p>
        </section>

        {/* Transaction Feedback Banner */}
        {(isWritePending || isConfirming || isConfirmed || writeError || confirmError) && (
          <div
            className={`p-4 rounded-2xl border text-sm transition-all shadow-xl ${
              writeError || confirmError
                ? 'bg-red-500/10 border-red-500/30 text-red-200'
                : isConfirmed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-violet-500/10 border-violet-500/30 text-violet-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isWritePending && (
                  <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                {isConfirming && (
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                {isConfirmed && <span className="text-emerald-400 font-bold">✓</span>}
                {(writeError || confirmError) && <span className="text-red-400 font-bold">✕</span>}

                <div>
                  <p className="font-semibold">
                    {isWritePending && 'Confirm transaction in your wallet...'}
                    {isConfirming && 'Waiting for block confirmation on Monad Testnet...'}
                    {isConfirmed && 'Transaction confirmed successfully!'}
                    {(writeError || confirmError) && 'Transaction encountered an error'}
                  </p>
                  {(writeError || confirmError) && (
                    <p className="text-xs text-red-300/80 mt-0.5 break-words">
                      {(writeError || confirmError)?.message?.slice(0, 160)}...
                    </p>
                  )}
                </div>
              </div>

              {hash && (
                <a
                  href={`https://testnet.monadexplorer.com/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline text-violet-300 hover:text-white transition-colors shrink-0"
                >
                  View on Explorer ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Main Bounty Display Card */}
        <section className="glass-panel-accent rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          {/* Status Badge Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Status:</span>
              {!hasBounty ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  No Bounty Active
                </span>
              ) : isBountyPaid ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/90 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Reward Claimed • Completed
                </span>
              ) : bounty?.approved ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  Solution Approved • Ready to Claim
                </span>
              ) : bounty?.submitted ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Solution Submitted • Under Review
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active • Open for Submissions
                </span>
              )}
            </div>

            {hasBounty && (
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Escrow:</span>
                <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  {isBountyPaid ? 'Disbursed' : 'Locked on-chain'}
                </span>
              </div>
            )}
          </div>

          {/* Bounty Content */}
          {hasBounty ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
                    {bounty?.title}
                  </h2>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                    {bounty?.description}
                  </p>
                </div>

                {/* Reward Callout */}
                <div className="bg-slate-900/90 border border-violet-500/30 rounded-2xl p-5 shrink-0 flex flex-col items-center justify-center min-w-[200px] shadow-lg shadow-violet-500/5">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Bounty Reward</span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-indigo-200 to-emerald-300 my-1">
                    {bounty?.reward ? formatEther(bounty.reward) : '0'} MON
                  </div>
                  <span className="text-[11px] text-slate-400">Guaranteed in Smart Contract</span>
                </div>
              </div>

              {/* Creator Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span>Organizer:</span>
                  <a
                    href={`https://testnet.monadexplorer.com/address/${bounty?.creator}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-violet-300 hover:text-white underline transition-colors"
                  >
                    {shortenAddress(bounty?.creator)}
                  </a>
                  {isCreator && (
                    <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px]">
                      You
                    </span>
                  )}
                </div>

                {bounty?.submitted && (
                  <div className="flex items-center gap-2">
                    <span>Solver:</span>
                    <a
                      href={`https://testnet.monadexplorer.com/address/${bounty?.solver}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-indigo-300 hover:text-white underline transition-colors"
                    >
                      {shortenAddress(bounty?.solver)}
                    </a>
                    {isSolver && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px]">
                        You
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-10 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl text-slate-400">
                🎯
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">No Active Bounty Currently</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  The bounty board is currently open for organizers to launch a new hackathon challenge with locked MON
                  rewards.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Dynamic Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* LEFT COLUMN: ORGANIZER SECTION */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                Organizer Zone
              </h3>
              {isCreator && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  Creator Access
                </span>
              )}
            </div>

            {/* Case 1: No active bounty (or completed) -> Allow anyone to create the bounty */}
            {(!hasBounty || isBountyPaid) && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <h4 className="text-sm font-semibold text-white mb-2">
                  {isBountyPaid ? 'Create Next Bounty' : 'Create the First Bounty'}
                </h4>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Post a challenge and lock MON into the escrow contract. The reward is safely held on Monad Testnet until
                  you approve a solution.
                </p>

                <form onSubmit={handleCreateBounty} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Bounty Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Build a Monad DeFi Liquid Staking Dashboard"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Description & Acceptance Criteria
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Specify requirements, deliverables, and submission guidelines..."
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Reward Amount (MON)
                      </label>
                      {balanceData && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Balance: {parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(3)} MON
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        required
                        placeholder="0.05"
                        value={rewardInput}
                        onChange={(e) => setRewardInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-slate-400">
                        MON
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      !isConnected ||
                      isWritePending ||
                      isConfirming ||
                      !titleInput ||
                      !descriptionInput ||
                      !rewardInput ||
                      isWrongNetwork
                    }
                    className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {!isConnected
                      ? 'Connect Wallet First'
                      : isWrongNetwork
                      ? 'Switch to Monad Testnet First'
                      : isWritePending && activeAction === 'create'
                      ? 'Confirm in Wallet...'
                      : isConfirming && activeAction === 'create'
                      ? 'Locking MON in Escrow...'
                      : 'Create Bounty & Deposit Reward'}
                  </button>
                </form>
              </div>
            )}

            {/* Case 2: Active bounty exists and user is the creator */}
            {isBountyActive && isCreator && (
              <div className="glass-panel rounded-2xl p-6 border border-violet-500/20">
                <div className="flex items-center gap-2 text-violet-300 font-semibold text-sm mb-3">
                  <span>👑</span> You are the Bounty Organizer
                </div>

                {!bounty?.submitted ? (
                  <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                    <p className="font-medium text-slate-300 mb-1">Awaiting Submissions</p>
                    Your {formatEther(bounty?.reward || BigInt(0))} MON reward is held safely in contract escrow. Participants can
                    now view this bounty and submit solutions.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-400 font-medium">Participant Submission:</span>
                        <span className="font-mono text-indigo-300">{shortenAddress(bounty?.solver)}</span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-lg border border-white/5 font-mono text-xs text-slate-200 break-all select-all">
                        {bounty?.solution}
                      </div>
                    </div>

                    {!bounty?.approved ? (
                      <button
                        onClick={handleApproveSolution}
                        disabled={isWritePending || isConfirming || isWrongNetwork}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isWritePending && activeAction === 'approve'
                          ? 'Confirm Approval in Wallet...'
                          : isConfirming && activeAction === 'approve'
                          ? 'Approving on Monad...'
                          : 'Approve Solution & Unlock Reward'}
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                        <span>✓</span> Solution approved! Waiting for solver to claim the reward.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Case 3: Active bounty exists but connected wallet is NOT creator */}
            {isBountyActive && !isCreator && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10 text-xs text-slate-400">
                <h4 className="font-semibold text-slate-300 mb-2">Organizer Overview</h4>
                <p className="leading-relaxed mb-3">
                  This bounty was deployed by{' '}
                  <span className="font-mono text-violet-300">{shortenAddress(bounty?.creator)}</span>.
                </p>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span>Contract Escrow Balance:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {bounty?.reward ? formatEther(bounty.reward) : '0'} MON
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PARTICIPANT SECTION */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Participant & Solver Zone
              </h3>
              {isSolver && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Assigned Solver
                </span>
              )}
            </div>

            {/* State A: Bounty exists, no solution submitted yet */}
            {isBountyActive && !bounty?.submitted && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <h4 className="text-sm font-semibold text-white mb-2">Submit Your Hackathon Solution</h4>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Provide your GitHub repository link, demo URL, or summary of your implementation to claim the bounty.
                </p>

                <form onSubmit={handleSubmitSolution} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Solution / Project URL or Proof
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="https://github.com/your-username/monad-hackathon-project or details of your implementation..."
                      value={solutionInput}
                      onChange={(e) => setSolutionInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono resize-none"
                    />
                  </div>

                  {isCreator && (
                    <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      Note: You are currently connected with the bounty creator address. Connect a different wallet to test
                      submitting as a participant.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      !isConnected ||
                      isWritePending ||
                      isConfirming ||
                      !solutionInput ||
                      isCreator ||
                      isWrongNetwork
                    }
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/25 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {!isConnected
                      ? 'Connect Wallet First'
                      : isWrongNetwork
                      ? 'Switch to Monad Testnet First'
                      : isCreator
                      ? 'Creator Cannot Submit Solution'
                      : isWritePending && activeAction === 'submit'
                      ? 'Confirm in Wallet...'
                      : isConfirming && activeAction === 'submit'
                      ? 'Submitting Proof to Monad...'
                      : 'Submit Solution'}
                  </button>
                </form>
              </div>
            )}

            {/* State B: Solution has been submitted */}
            {hasBounty && bounty?.submitted && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Submitted Solution</h4>
                  {bounty?.approved ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Approved
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                      Pending Review
                    </span>
                  )}
                </div>

                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 text-xs">
                  <p className="text-slate-400 text-[11px] mb-1">Submitted by:</p>
                  <p className="font-mono text-indigo-300 break-all mb-3">{bounty?.solver}</p>

                  <p className="text-slate-400 text-[11px] mb-1">Solution Proof:</p>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5 font-mono text-slate-200 break-all select-all">
                    {bounty?.solution}
                  </div>
                </div>

                {/* Solver Claim Reward Section */}
                {bounty?.approved && !bounty?.paid && (
                  <div className="bg-gradient-to-br from-violet-950/60 to-purple-900/40 border border-purple-500/30 p-5 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <div>
                        <p className="font-bold text-white text-sm">Solution Approved by Organizer!</p>
                        <p className="text-xs text-purple-200/80">
                          {isSolver
                            ? `You can now withdraw the ${formatEther(bounty.reward)} MON bounty reward.`
                            : `Solver ${shortenAddress(bounty.solver)} is authorized to claim the reward.`}
                        </p>
                      </div>
                    </div>

                    {isSolver ? (
                      <button
                        onClick={handleClaimReward}
                        disabled={isWritePending || isConfirming || isWrongNetwork}
                        className="mt-1 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 cursor-pointer disabled:opacity-50"
                      >
                        {isWritePending && activeAction === 'claim'
                          ? 'Confirm Claim in Wallet...'
                          : isConfirming && activeAction === 'claim'
                          ? 'Transferring MON...'
                          : `Claim ${formatEther(bounty.reward)} MON Reward`}
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-400 bg-black/30 p-2.5 rounded-lg border border-white/5 text-center">
                        Connect with solver address <span className="font-mono text-indigo-300">{shortenAddress(bounty.solver)}</span> to claim.
                      </p>
                    )}
                  </div>
                )}

                {/* Reward Claimed Complete State */}
                {bounty?.paid && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
                    <span className="text-lg">🏆</span>
                    <div>
                      <p className="font-semibold">Bounty Completed & Paid</p>
                      <p className="text-emerald-300/80 text-[11px]">
                        The {formatEther(bounty.reward)} MON reward was successfully transferred to the solver.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* State C: No bounty active yet */}
            {!hasBounty && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10 text-xs text-slate-400 text-center py-8">
                <p className="mb-1 text-slate-300 font-medium">Submissions are currently closed</p>
                <p>When an organizer launches a bounty, you will be able to submit your solution here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Contract & Workshop Info Collapsible */}
        <div className="mt-6 border-t border-white/5 pt-6 flex flex-col items-center">
          <button
            onClick={() => setShowContractDetails(!showContractDetails)}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center gap-2"
          >
            <span>{showContractDetails ? '▼' : '▶'}</span>
            Contract & Deployment Info
          </button>

          {showContractDetails && (
            <div className="mt-4 w-full glass-panel rounded-2xl p-5 border border-white/10 text-xs text-slate-300 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-white/5">
                <span className="text-slate-400">Deployed Contract Address:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-violet-300 break-all">
                    {contractAddress || 'Not set in .env (NEXT_PUBLIC_CONTRACT_ADDRESS)'}
                  </span>
                  {contractAddress && (
                    <a
                      href={`https://testnet.monadexplorer.com/address/${contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white underline text-[11px]"
                    >
                      Explorer ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <span className="text-slate-400">Network & Chain ID:</span>
                <span className="font-mono text-slate-200">Monad Testnet (10143)</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Contract Architecture:</span>
                <span className="text-slate-200">Single Bounty Escrow with Reentrancy Protection</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        <p>Built with Next.js, Wagmi v2, Viem, and Hardhat on Monad Testnet</p>
      </footer>
    </div>
  );
}
