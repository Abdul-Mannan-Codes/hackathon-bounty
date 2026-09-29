import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BountyBoardModule", (m) => {
  const bountyBoard = m.contract("BountyBoard");

  return { bountyBoard };
});
