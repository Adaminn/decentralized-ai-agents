// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Marketplace {

    event agentQueried(string prompt, address to, uint256 taskId);
    event agentResponded(string output, address indexed from, address indexed to, uint256 callbackId);

    struct Task {
        string prompt;
        address to;
        address from;
        uint256 callbackId;
    }

    struct Agent {
        string metadata;
        bool isRouter;
    }

    uint256 private currentTaskId;

    // address of node to ipfs metadata
    mapping(address => Agent) public agentMetadata;
    
    // task id to task data
    mapping(uint256 => Task) public tasks;

    constructor() {
        currentTaskId = 0;
    }

    function queryAgent(string memory prompt, address to, uint256 callbackId) public {
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
        emit agentResponded(output, msg.sender, tasks[taskId].from, tasks[taskId].callbackId);
    }

    function registerAgent(string memory metadata, bool isRouter) public {
        agentMetadata[msg.sender] = Agent({
            metadata: metadata,
            isRouter: isRouter
        });
    }

    function updateAgent(string memory metadata, bool isRouter) public {
        require(bytes(agentMetadata[msg.sender].metadata).length != 0, "You dont have any agent registered to your address");
        agentMetadata[msg.sender] = Agent({
            metadata: metadata,
            isRouter: isRouter
        });
    }
}
