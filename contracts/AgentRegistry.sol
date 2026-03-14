// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @notice Registers autonomous AI agents onchain with their public keys and metadata.
 * @dev Each agent has an owner (wallet), a unique public key, and configurable parameters.
 */
contract AgentRegistry is Ownable {
    struct Agent {
        address owner;
        bytes32 publicKeyHash;    // Hash of agent's Ed25519 public key
        string name;
        string strategy;          // "conservative", "balanced", "aggressive"
        uint256 maxPositionSize;  // In USDT (18 decimals)
        uint256 reputation;       // 0–1000
        uint256 totalEarnings;    // In USDT
        uint256 registeredAt;
        bool active;
    }

    mapping(bytes32 => Agent) public agents;       // agentId => Agent
    mapping(address => bytes32[]) public ownerAgents; // owner => agentIds
    bytes32[] public allAgentIds;

    uint256 public registrationFee = 0; // Free on testnet
    uint256 public totalAgents;
    uint256 public totalValueManaged;

    event AgentRegistered(
        bytes32 indexed agentId,
        address indexed owner,
        string name,
        string strategy,
        uint256 timestamp
    );

    event AgentUpdated(bytes32 indexed agentId, string name, string strategy);
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentActivated(bytes32 indexed agentId);
    event ReputationUpdated(bytes32 indexed agentId, uint256 newReputation);
    event EarningsRecorded(bytes32 indexed agentId, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register a new agent
     * @param publicKeyHash Hash of the agent's Ed25519 public key
     * @param name Human-readable agent name
     * @param strategy Strategy type
     * @param maxPositionSize Maximum position size in USDT
     */
    function registerAgent(
        bytes32 publicKeyHash,
        string calldata name,
        string calldata strategy,
        uint256 maxPositionSize
    ) external payable returns (bytes32 agentId) {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(bytes(name).length > 0, "Name required");
        require(maxPositionSize > 0, "Max position must be > 0");

        // Generate unique agent ID
        agentId = keccak256(abi.encodePacked(msg.sender, publicKeyHash, block.timestamp));
        require(agents[agentId].registeredAt == 0, "Agent already exists");

        agents[agentId] = Agent({
            owner: msg.sender,
            publicKeyHash: publicKeyHash,
            name: name,
            strategy: strategy,
            maxPositionSize: maxPositionSize,
            reputation: 500, // Start at 500/1000
            totalEarnings: 0,
            registeredAt: block.timestamp,
            active: true
        });

        ownerAgents[msg.sender].push(agentId);
        allAgentIds.push(agentId);
        totalAgents++;

        emit AgentRegistered(agentId, msg.sender, name, strategy, block.timestamp);
        return agentId;
    }

    /**
     * @notice Update agent configuration
     */
    function updateAgent(
        bytes32 agentId,
        string calldata name,
        string calldata strategy,
        uint256 maxPositionSize
    ) external {
        Agent storage agent = agents[agentId];
        require(agent.owner == msg.sender, "Not agent owner");
        require(agent.registeredAt > 0, "Agent not found");

        if (bytes(name).length > 0) agent.name = name;
        if (bytes(strategy).length > 0) agent.strategy = strategy;
        if (maxPositionSize > 0) agent.maxPositionSize = maxPositionSize;

        emit AgentUpdated(agentId, name, strategy);
    }

    /**
     * @notice Deactivate an agent
     */
    function deactivateAgent(bytes32 agentId) external {
        Agent storage agent = agents[agentId];
        require(agent.owner == msg.sender, "Not agent owner");
        agent.active = false;
        emit AgentDeactivated(agentId);
    }

    /**
     * @notice Activate an agent
     */
    function activateAgent(bytes32 agentId) external {
        Agent storage agent = agents[agentId];
        require(agent.owner == msg.sender, "Not agent owner");
        agent.active = true;
        emit AgentActivated(agentId);
    }

    /**
     * @notice Update agent reputation (only contract owner/protocol)
     */
    function updateReputation(bytes32 agentId, uint256 points, bool add) external onlyOwner {
        Agent storage agent = agents[agentId];
        require(agent.registeredAt > 0, "Agent not found");

        if (add) {
            agent.reputation = agent.reputation + points > 1000 ? 1000 : agent.reputation + points;
        } else {
            agent.reputation = agent.reputation > points ? agent.reputation - points : 0;
        }

        emit ReputationUpdated(agentId, agent.reputation);
    }

    /**
     * @notice Record earnings for an agent (only contract owner/protocol)
     */
    function recordEarnings(bytes32 agentId, uint256 amount) external onlyOwner {
        Agent storage agent = agents[agentId];
        require(agent.registeredAt > 0, "Agent not found");
        agent.totalEarnings += amount;
        totalValueManaged += amount;
        emit EarningsRecorded(agentId, amount);
    }

    // --- View functions ---

    function getAgent(bytes32 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }

    function getOwnerAgents(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }

    function getAgentCount() external view returns (uint256) {
        return totalAgents;
    }

    function getAllAgentIds() external view returns (bytes32[] memory) {
        return allAgentIds;
    }

    function getOwnerAgentCount(address owner) external view returns (uint256) {
        return ownerAgents[owner].length;
    }

    // --- Admin ---

    function setRegistrationFee(uint256 fee) external onlyOwner {
        registrationFee = fee;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
