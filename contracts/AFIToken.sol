// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AFIToken
 * @notice ERC20 reward token for AgentFi protocol.
 * @dev Minted as rewards for successful agent actions.
 */
contract AFIToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18; // 100M tokens

    // Reward rates (in tokens, 18 decimal)
    uint256 public commitRevealReward = 2 * 1e18;      // 2 AFI per successful commit-reveal
    uint256 public longPositionReward = 5 * 1e18;       // 5 AFI for position > 30 days
    uint256 public topPerformerReward = 3 * 1e18;       // 3 AFI for top 10% APY
    uint256 public zeroErrorWeekReward = 10 * 1e18;     // 10 AFI for zero-error week

    mapping(address => uint256) public claimable;        // Claimable rewards per address
    mapping(address => uint256) public totalEarned;      // Total earned per address

    event RewardAccrued(address indexed account, uint256 amount, string reason);
    event RewardClaimed(address indexed account, uint256 amount);

    constructor() ERC20("AgentFi Token", "AFI") Ownable(msg.sender) {
        // Mint initial supply to deployer for distribution
        _mint(msg.sender, 10_000_000 * 1e18); // 10M initial
    }

    /**
     * @notice Accrue rewards for an address
     */
    function accrueReward(address account, uint256 amount, string calldata reason) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        claimable[account] += amount;
        totalEarned[account] += amount;
        emit RewardAccrued(account, amount, reason);
    }

    /**
     * @notice Claim all accrued rewards
     */
    function claim() external {
        uint256 amount = claimable[msg.sender];
        require(amount > 0, "Nothing to claim");

        claimable[msg.sender] = 0;
        _mint(msg.sender, amount);

        emit RewardClaimed(msg.sender, amount);
    }

    /**
     * @notice Get claimable balance
     */
    function getClaimable(address account) external view returns (uint256) {
        return claimable[account];
    }

    /**
     * @notice Get total earned
     */
    function getTotalEarned(address account) external view returns (uint256) {
        return totalEarned[account];
    }

    // --- Admin ---

    function setRewardRates(
        uint256 _commitReveal,
        uint256 _longPosition,
        uint256 _topPerformer,
        uint256 _zeroError
    ) external onlyOwner {
        commitRevealReward = _commitReveal;
        longPositionReward = _longPosition;
        topPerformerReward = _topPerformer;
        zeroErrorWeekReward = _zeroError;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}
