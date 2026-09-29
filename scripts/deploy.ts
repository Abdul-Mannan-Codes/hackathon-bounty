import hre from "hardhat";
const { ethers } = hre;
import { writeFileSync } from "fs";

async function main() {
  const signers = await ethers.getSigners();
  console.log("Signers found:", signers.length);
  if (signers.length === 0) {
    throw new Error("No account loaded. PRIVATE_KEY is not being read from .env");
  }

  const deployer = signers[0];
  console.log("Deploying with:", deployer.address);

  const bountyBoard = await ethers.deployContract("BountyBoard");
  await bountyBoard.waitForDeployment();

  const address = await bountyBoard.getAddress();
  console.log("BountyBoard deployed to:", address);
  writeFileSync("deployed-address.txt", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});