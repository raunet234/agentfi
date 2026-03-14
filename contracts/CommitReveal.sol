// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CommitReveal
 * @notice Implements a commit-reveal scheme for private agent actions.
 * @dev Agents commit a hash of their intended action, wait N blocks, then reveal.
 */
contract CommitReveal is Ownable {
    uint256 public commitWindow = 5; // Blocks to wait before reveal

    struct Commitment {
        bytes32 agentId;
        address committer;
        bytes32 commitHash;       // keccak256(action, salt)
        uint256 commitBlock;
        uint256 revealedBlock;
        string action;            // Revealed action (empty until revealed)
        string protocol;          // Target protocol
        uint256 amount;           // Action amount
        bool revealed;
        bool executed;
    }

    mapping(bytes32 => Commitment) public commitments; // commitId => Commitment
    mapping(bytes32 => bytes32[]) public agentCommitments; // agentId => commitIds
    bytes32[] public allCommitIds;

    uint256 public totalCommits;
    uint256 public totalReveals;
    uint256 public totalExecutions;

    event ActionCommitted(
        bytes32 indexed commitId,
        bytes32 indexed agentId,
        bytes32 commitHash,
        uint256 commitBlock
    );

    event ActionRevealed(
        bytes32 indexed commitId,
        bytes32 indexed agentId,
        string action,
        string protocol,
        uint256 amount
    );

    event ActionExecuted(bytes32 indexed commitId, bytes32 indexed agentId);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Commit a hashed action
     * @param agentId The agent performing the action
     * @param commitHash keccak256(abi.encodePacked(action, protocol, amount, salt))
     */
    function commit(bytes32 agentId, bytes32 commitHash) external returns (bytes32 commitId) {
        commitId = keccak256(abi.encodePacked(agentId, commitHash, block.number));

        commitments[commitId] = Commitment({
            agentId: agentId,
            committer: msg.sender,
            commitHash: commitHash,
            commitBlock: block.number,
            revealedBlock: 0,
            action: "",
            protocol: "",
            amount: 0,
            revealed: false,
            executed: false
        });

        agentCommitments[agentId].push(commitId);
        allCommitIds.push(commitId);
        totalCommits++;

        emit ActionCommitted(commitId, agentId, commitHash, block.number);
        return commitId;
    }

    /**
     * @notice Reveal a previously committed action
     * @param commitId The commitment to reveal
     * @param action The action type (e.g., "supply", "borrow", "withdraw")
     * @param protocol Target protocol name
     * @param amount Amount involved
     * @param salt Random salt used in the commit
     */
    function reveal(
        bytes32 commitId,
        string calldata action,
        string calldata protocol,
        uint256 amount,
        bytes32 salt
    ) external {
        Commitment storage c = commitments[commitId];
        require(c.commitBlock > 0, "Commitment not found");
        require(c.committer == msg.sender, "Not committer");
        require(!c.revealed, "Already revealed");
        require(block.number >= c.commitBlock + commitWindow, "Too early to reveal");

        // Verify the hash matches
        bytes32 expectedHash = keccak256(abi.encodePacked(action, protocol, amount, salt));
        require(expectedHash == c.commitHash, "Hash mismatch - invalid reveal");

        c.revealed = true;
        c.revealedBlock = block.number;
        c.action = action;
        c.protocol = protocol;
        c.amount = amount;
        totalReveals++;

        emit ActionRevealed(commitId, c.agentId, action, protocol, amount);
    }

    /**
     * @notice Mark a revealed action as executed (called by protocol or admin)
     */
    function markExecuted(bytes32 commitId) external onlyOwner {
        Commitment storage c = commitments[commitId];
        require(c.revealed, "Not yet revealed");
        require(!c.executed, "Already executed");

        c.executed = true;
        totalExecutions++;

        emit ActionExecuted(commitId, c.agentId);
    }

    // --- View functions ---

    function getCommitment(bytes32 commitId) external view returns (Commitment memory) {
        return commitments[commitId];
    }

    function getAgentCommitments(bytes32 agentId) external view returns (bytes32[] memory) {
        return agentCommitments[agentId];
    }

    function canReveal(bytes32 commitId) external view returns (bool) {
        Commitment storage c = commitments[commitId];
        return c.commitBlock > 0 && !c.revealed && block.number >= c.commitBlock + commitWindow;
    }

    function blocksUntilReveal(bytes32 commitId) external view returns (uint256) {
        Commitment storage c = commitments[commitId];
        if (c.commitBlock == 0 || c.revealed) return 0;
        uint256 revealBlock = c.commitBlock + commitWindow;
        if (block.number >= revealBlock) return 0;
        return revealBlock - block.number;
    }

    function getStats() external view returns (uint256, uint256, uint256) {
        return (totalCommits, totalReveals, totalExecutions);
    }

    function getAllCommitIds() external view returns (bytes32[] memory) {
        return allCommitIds;
    }

    // --- Admin ---

    function setCommitWindow(uint256 blocks) external onlyOwner {
        commitWindow = blocks;
    }
}
