import { expect } from "chai";
import hre from "hardhat";
import "@nomicfoundation/hardhat-ethers";
const { ethers } = hre;
import { BountyBoard } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BountyBoard Smart Contract", function () {
  let bountyBoard: BountyBoard;
  let owner: HardhatEthersSigner;
  let participant: HardhatEthersSigner;
  let thirdParty: HardhatEthersSigner;

  const title = "Build Monad Liquid Staking dApp";
  const description = "Create a full-stack liquid staking dashboard on Monad Testnet.";
  const reward = ethers.parseEther("0.1");

  beforeEach(async function () {
    [owner, participant, thirdParty] = await ethers.getSigners();
    const BountyBoardFactory = await ethers.getContractFactory("BountyBoard");
    bountyBoard = await BountyBoardFactory.deploy();
    await bountyBoard.waitForDeployment();
  });

  it("should deploy with no bounty active initially", async function () {
    expect(await bountyBoard.bountyExists()).to.equal(false);
  });

  it("should allow organizer to create a bounty and lock MON in escrow", async function () {
    await expect(
      bountyBoard.connect(owner).createBounty(title, description, { value: reward })
    )
      .to.emit(bountyBoard, "BountyCreated")
      .withArgs(owner.address, reward, title, description);

    expect(await bountyBoard.bountyExists()).to.equal(true);

    const bounty = await bountyBoard.getBounty();
    expect(bounty.creator).to.equal(owner.address);
    expect(bounty.reward).to.equal(reward);
    expect(bounty.title).to.equal(title);
    expect(bounty.description).to.equal(description);
    expect(bounty.submitted).to.equal(false);
    expect(bounty.approved).to.equal(false);
    expect(bounty.paid).to.equal(false);

    // Verify contract balance holds the escrow reward
    const contractBalance = await ethers.provider.getBalance(await bountyBoard.getAddress());
    expect(contractBalance).to.equal(reward);
  });

  it("should reject bounty creation with 0 reward or empty fields", async function () {
    await expect(
      bountyBoard.connect(owner).createBounty(title, description, { value: 0 })
    ).to.be.revertedWith("Reward must be greater than 0");

    await expect(
      bountyBoard.connect(owner).createBounty("", description, { value: reward })
    ).to.be.revertedWith("Title cannot be empty");

    await expect(
      bountyBoard.connect(owner).createBounty(title, "", { value: reward })
    ).to.be.revertedWith("Description cannot be empty");
  });

  it("should prevent creating another bounty while one is active", async function () {
    await bountyBoard.connect(owner).createBounty(title, description, { value: reward });
    await expect(
      bountyBoard.connect(thirdParty).createBounty("Another Bounty", "Desc", { value: reward })
    ).to.be.revertedWith("An active bounty already exists");
  });

  it("should allow a participant to submit a solution", async function () {
    await bountyBoard.connect(owner).createBounty(title, description, { value: reward });

    const solutionUrl = "https://github.com/monad-builder/liquid-staking";
    await expect(bountyBoard.connect(participant).submitSolution(solutionUrl))
      .to.emit(bountyBoard, "SolutionSubmitted")
      .withArgs(participant.address, solutionUrl);

    const bounty = await bountyBoard.getBounty();
    expect(bounty.solver).to.equal(participant.address);
    expect(bounty.solution).to.equal(solutionUrl);
    expect(bounty.submitted).to.equal(true);
  });

  it("should not allow creator to submit solution to their own bounty", async function () {
    await bountyBoard.connect(owner).createBounty(title, description, { value: reward });
    await expect(
      bountyBoard.connect(owner).submitSolution("https://github.com/my-solution")
    ).to.be.revertedWith("Creator cannot submit solution");
  });

  it("should only allow creator to approve submitted solution", async function () {
    await bountyBoard.connect(owner).createBounty(title, description, { value: reward });
    await bountyBoard.connect(participant).submitSolution("https://github.com/participant/solution");

    // Third party should not be able to approve
    await expect(
      bountyBoard.connect(thirdParty).approveSolution()
    ).to.be.revertedWith("Only bounty creator can approve");

    // Owner approves
    await expect(bountyBoard.connect(owner).approveSolution())
      .to.emit(bountyBoard, "SolutionApproved")
      .withArgs(participant.address);

    const bounty = await bountyBoard.getBounty();
    expect(bounty.approved).to.equal(true);
  });

  it("should allow approved solver to claim reward and transfer funds", async function () {
    await bountyBoard.connect(owner).createBounty(title, description, { value: reward });
    await bountyBoard.connect(participant).submitSolution("https://github.com/participant/solution");
    await bountyBoard.connect(owner).approveSolution();

    // Third party should not be able to claim
    await expect(
      bountyBoard.connect(thirdParty).claimReward()
    ).to.be.revertedWith("Only solver can claim reward");

    const initialParticipantBalance = await ethers.provider.getBalance(participant.address);

    // Participant claims reward
    const tx = await bountyBoard.connect(participant).claimReward();
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction receipt is null");
    const gasUsed = receipt.gasUsed * receipt.gasPrice;

    const finalParticipantBalance = await ethers.provider.getBalance(participant.address);
    expect(finalParticipantBalance).to.equal(initialParticipantBalance + reward - gasUsed);

    // Contract balance should now be 0
    const contractBalance = await ethers.provider.getBalance(await bountyBoard.getAddress());
    expect(contractBalance).to.equal(0);

    const bounty = await bountyBoard.getBounty();
    expect(bounty.paid).to.equal(true);

    // Cannot claim twice
    await expect(
      bountyBoard.connect(participant).claimReward()
    ).to.be.revertedWith("Reward has already been claimed");
  });
});
