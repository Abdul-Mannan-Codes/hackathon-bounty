// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BountyBoard {
    struct Bounty {
        address payable creator;
        uint256 reward;
        string title;
        string description;
        address payable solver;
        string solution;
        bool submitted;
        bool approved;
        bool paid;
    }

    Bounty public bounty;
    bool public bountyExists;

    event BountyCreated(address indexed creator, uint256 reward, string title, string description);
    event SolutionSubmitted(address indexed solver, string solution);
    event SolutionApproved(address indexed solver);
    event RewardClaimed(address indexed solver, uint256 reward);
    event SolutionRejected(address indexed solver);
    event BountyCancelled(address indexed creator, uint256 refund);

    function createBounty(string memory _title, string memory _description) external payable {
        require(msg.value > 0, "Reward must be greater than 0");
        require(!bountyExists || bounty.paid, "An active bounty already exists");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");

        bounty = Bounty({
            creator: payable(msg.sender),
            reward: msg.value,
            title: _title,
            description: _description,
            solver: payable(address(0)),
            solution: "",
            submitted: false,
            approved: false,
            paid: false
        });
        bountyExists = true;

        emit BountyCreated(msg.sender, msg.value, _title, _description);
    }

    function submitSolution(string memory _solution) external {
        require(bountyExists, "No active bounty exists");
        require(!bounty.submitted, "Solution has already been submitted");
        require(!bounty.paid, "Bounty reward has already been paid");
        require(bytes(_solution).length > 0, "Solution cannot be empty");
        require(msg.sender != bounty.creator, "Creator cannot submit solution");

        bounty.solver = payable(msg.sender);
        bounty.solution = _solution;
        bounty.submitted = true;

        emit SolutionSubmitted(msg.sender, _solution);
    }

    function approveSolution() external {
        require(bountyExists, "No active bounty exists");
        require(msg.sender == bounty.creator, "Only bounty creator can approve");
        require(bounty.submitted, "No solution submitted to approve");
        require(!bounty.approved, "Solution has already been approved");

        bounty.approved = true;

        emit SolutionApproved(bounty.solver);
    }

    function rejectSolution() external {
        require(bountyExists, "No active bounty exists");
        require(msg.sender == bounty.creator, "Only bounty creator can reject");
        require(bounty.submitted, "No solution submitted to reject");
        require(!bounty.approved, "Solution already approved");

        address rejected = bounty.solver;
        bounty.solver = payable(address(0));
        bounty.solution = "";
        bounty.submitted = false;

        emit SolutionRejected(rejected);
    }

    function claimReward() external {
        require(bountyExists, "No active bounty exists");
        require(bounty.approved, "Solution has not been approved yet");
        require(!bounty.paid, "Reward has already been claimed");
        require(msg.sender == bounty.solver, "Only solver can claim reward");

        // Set paid state before external transfer to mitigate reentrancy risk
        bounty.paid = true;
        uint256 rewardAmount = bounty.reward;

        (bool success, ) = bounty.solver.call{value: rewardAmount}("");
        require(success, "Reward transfer failed");

        emit RewardClaimed(bounty.solver, rewardAmount);
    }

    function cancelBounty() external {
        require(bountyExists, "No active bounty exists");
        require(msg.sender == bounty.creator, "Only bounty creator can cancel");
        require(!bounty.approved, "Cannot cancel after approval");
        require(!bounty.paid, "Bounty already paid");

        address payable creator = bounty.creator;
        uint256 refund = bounty.reward;

        // Clear state before sending funds
        delete bounty;
        bountyExists = false;

        (bool success, ) = creator.call{value: refund}("");
        require(success, "Refund failed");

        emit BountyCancelled(creator, refund);
    }

    function getBounty() external view returns (Bounty memory) {
        return bounty;
    }
}