// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Marketplace {
    using SafeERC20 for IERC20;

    event agentQueried(string prompt, address to, uint256 taskId);
    event agentResponded(string output, address indexed to, uint256 callbackId);
    event tokensDeposited(address user, address token, uint256 amount);
    event tokensWithdrawn(address user, address token, uint256 amount);

    struct Task {
        string prompt;
        address to;
        address from;
        uint256 callbackId;
    }

    struct Agent {
        string metadata;
        mapping(address => uint256) prices;
        uint256 reputation;
    }

    uint256 private currentTaskId;

    // address of node to ipfs metadata
    mapping(address => Agent) public agentMetadata;

    // store addresses to then be able to traverse the mapping  
    address[] private agentAddresses;
    
    // task id to task data
    mapping(uint256 => Task) public tasks;

    // user address to their deposited token balance
    mapping(address => mapping(address => uint256)) public userBalances; // user -> token -> balance


    constructor() {
        currentTaskId = 0;
    }

    function queryAgent(string memory prompt, address to, uint256 callbackId, address token) public {

        // pay agent
        require(bytes(agentMetadata[to].metadata).length != 0, "Agent does not exist");
        uint256 price = agentMetadata[to].prices[token];
        require(price > 0, "Agent does not accept this token");
        require(userBalances[msg.sender][token] >= price, "Insufficient balance");

        // Transfer tokens from user balance to agent
        userBalances[msg.sender][token] -= price;
        userBalances[to][token] += price;

        // queryAgent
        currentTaskId++;
        tasks[currentTaskId] = Task({
            prompt: prompt,
            to: to,
            from: msg.sender,
            callbackId: callbackId
        });

        emit agentQueried(prompt, to, currentTaskId);
    }

    function respond(string memory output, uint256 taskId) public {
        require(tasks[taskId].to == msg.sender, "Only the agent creator can respond to a task");
        agentMetadata[msg.sender].reputation += 1;
        emit agentResponded(output, tasks[taskId].from, tasks[taskId].callbackId);
    }

    function registerAgent(string memory metadata) public {
        require(bytes(agentMetadata[msg.sender].metadata).length == 0, "Agent already exists");
        agentAddresses.push(msg.sender);
        agentMetadata[msg.sender] = Agent({
            metadata: metadata,
            reputation: 0
        });
    }

    function updateAgent(string memory metadata) public {
        require(bytes(agentMetadata[msg.sender].metadata).length != 0, "You dont have any agent registered to your address");
        agentMetadata[msg.sender] = Agent({
            metadata: metadata,
        });
    }

    function getAllAgentData() public view returns (address[] memory, Agent[] memory) {
        uint256 length = agentAddresses.length;
        Agent[] memory agents = new Agent[](length);
        for (uint256 i = 0; i < length; i++) {
            agents[i] = agentMetadata[agentAddresses[i]];
        }
        return (agentAddresses, agents);
    }

    function setAgentPrice(address token, uint256 price) public {
        require(bytes(agentMetadata[msg.sender].metadata).length != 0, "You don't have any agent registered to your address");
        agentMetadata[msg.sender].prices[token] = price;
    }


    function depositTokens(address token, uint256 amount) public {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userBalances[msg.sender][token] += amount;
        emit tokensDeposited(msg.sender, token, amount);
    }

    function withdrawTokens(address token, uint256 amount) public {
        require(userBalances[msg.sender][token] >= amount, "Insufficient balance");
        userBalances[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit tokensWithdrawn(msg.sender, token, amount);
    }

    function getAgentPrice(address agentAddress, address token) public view returns (uint256) {
        return agentMetadata[agentAddress].prices[token];
    }
}
