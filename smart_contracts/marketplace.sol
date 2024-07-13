// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Marketplace {

    // Add and remove intelligent agents
    event IntelligentAgentAdded(address agent, uint256 salary, string jobDescription, uint256 reputation);
    event IntelligentAgentUpdated(address agent, uint256 salary, string jobDescription, uint256 reputation);
    event RouterManagerAdded(address manager);

    // Initial query from user to router manager
    event QuerySent(string query, address routerAddress);

    // Result received by
    event ResultReceived(string result);

    // Router manager asks for single task
    event ManagerTaskRequest(address indexed wallet, string query);

    // Router manager asks for bouncing task
    event BouncingTaskRequest(address indexed wallet, uint256 taskId, string query, uint256 nextTaskId);

    // Funds sent to router and intelligent agent
    event FundsDistributed(address indexed recipient, uint256 amount);

    struct IntelligentAgent {
        uint256 salary; // Price per token for intelligent agent
        string jobDescription; // Description of what the intelligent agent's specialization is
        uint256 reputation; // Reputation of the intelligent agent
    }

    struct RouterManager {
        uint256 salary; // Salary of the router manager
        uint256 reputation; // Reputation of the router manager
    }

    struct Task {
        address requester;
        string query;
    }

    struct BouncingTask {
        uint256 id;
        address requester;
        string query;
        uint256 nextTaskId;
    }

    mapping(address => RouterManager) public routerManagers; // Mapping wallet addresses of router managers
    mapping(address => IntelligentAgent) public intelligentAgents; // Mapping wallet addresses of intelligent agents

    Task[] public tasks; // Array to store single tasks
    BouncingTask[] public bouncingTasks; // Array to store bouncing tasks
    uint256 public nextTaskId; // ID counter for bouncing tasks

    modifier onlyRouterManager() {
        require(routerManagers[msg.sender].salary != 0, "Only a router manager can call this function");
        _;
    }

    modifier onlyIntelligentAgent() {
        require(intelligentAgents[msg.sender].salary != 0, "Only an intelligent agent can call this function");
        _;
    }

    constructor(address _initialRouterManager) {
        routerManagers[_initialRouterManager] = RouterManager({
            salary: 0,
            reputation: 0
        });
    }

    // Function for a router manager to add himself initially
    function addRouterManager(
        uint256 _salary
    ) public {
        routerManagers[msg.sender] = RouterManager({
            salary: _salary,
            reputation: 0
        });
        emit RouterManagerAdded(msg.sender);
    }

    // Function for an intelligent agent to add himself initially
    function addIntelligentAgent(
        uint256 _salary,
        string memory _jobDescription
    ) public {
        intelligentAgents[msg.sender] = IntelligentAgent({
            salary: _salary,
            jobDescription: _jobDescription,
            reputation: 0
        });
        emit IntelligentAgentAdded(msg.sender, _salary, _jobDescription, 0);
    }

    // Function for intelligent agent to update himself
    function updateIntelligentAgent(
        address _agent,
        uint256 _salary,
        string memory _jobDescription
    ) public onlyIntelligentAgent {
        if(msg.sender == _agent) {
            require(intelligentAgents[_agent].salary != 0, "Intelligent agent does not exist");
            intelligentAgents[_agent].salary = _salary;
            intelligentAgents[_agent].jobDescription = _jobDescription;
            emit IntelligentAgentUpdated(_agent, _salary, _jobDescription, intelligentAgents[_agent].reputation);
        }
    }

    // Function for user to query for intelligent agent output
    function queryIntelligence(string memory _query, address _routerAddress) public {
        emit QuerySent(_query, _routerAddress);
    }

    // Function for router manager to ask intelligent agent for a single task
    function managerTaskRequest(address wallet, string memory query) public onlyRouterManager {
        tasks.push(Task({
            requester: wallet,
            query: query
        }));
        emit ManagerTaskRequest(wallet, query);
    }

    // Function for intelligent agent to submit a single task
    function submitTask(address wallet, string memory result) public onlyIntelligentAgent {
        bool validTask = false;
        uint256 taskIndex = 0;

        for (uint256 i = 0; i < tasks.length; i++) {
            if (tasks[i].requester == wallet) {
                validTask = true;
                taskIndex = i;
                break;
            }
        }

        require(validTask, "No matching task found");

        // Remove the task from the array
        tasks[taskIndex] = tasks[tasks.length - 1];
        tasks.pop();

        // Reward the caller with 0.01 ETH
        require(address(this).balance >= 0.01 ether, "Not enough balance to reward");
        payable(msg.sender).transfer(0.01 ether);

        emit ResultReceived(result);
    }

     function managerBouncingTaskRequest(address wallet, string memory query, uint256 nextTaskId) public onlyRouterManager {
        bouncingTasks.push(BouncingTask({
            id: nextTaskId,
            requester: wallet,
            query: query,
            nextTaskId: nextTaskId
        }));
        emit BouncingTaskRequest(wallet, nextTaskId, query);
        nextTaskId++;
    }

    // Function for intelligent agent to submit a bouncing task
    function submitBouncingTask(uint256 taskId, string memory result) public onlyIntelligentAgent {
        bool validTask = false;
        uint256 taskIndex = 0;

        for (uint256 i = 0; i < bouncingTasks.length; i++) {
            if (bouncingTasks[i].id == taskId) {
                validTask = true;
                taskIndex = i;
                break;
            }
        }

        require(validTask, "No matching task found");

        // Reward the caller with 0.01 ETH
        require(address(this).balance >= 0.01 ether, "Not enough balance to reward");
        payable(msg.sender).transfer(0.01 ether);

        emit ResultReceived(result);

        // If there is a next task, trigger it
        uint256 nextTaskId = bouncingTasks[taskIndex].nextTaskId;
        if (nextTaskId != 0) {
            for (uint256 i = 0; i < bouncingTasks.length; i++) {
                if (bouncingTasks[i].id == nextTaskId) {
                    managerBouncingTaskRequest(bouncingTasks[i].requester, bouncingTasks[i].query, bouncingTasks[i].nextTaskId);
                    break;
                }
            }
        }

        // Delete the completed task from the array
        delete bouncingTasks[taskIndex];
    }

}