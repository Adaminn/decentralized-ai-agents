// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Marketplace {
    
    event QuerySent(string query);
    event ResultReceived(string result);
    event FundsDistributed(address indexed recipient, uint256 amount);
    event IntelligentAgentAdded(address agent, string modelData, uint256 salary, string jobDescription);
    event IntelligentAgentUpdated(address agent, string modelData, uint256 salary, string jobDescription);
    event RouterManagerAdded(address manager);
    event RouterManagerRemoved(address manager);

    struct IntelligentAgent {
        string modelData;
        uint256 salary;
        string jobDescription;
        bool exists;
    }

    mapping(address => bool) public routerManagers;
    mapping(address => IntelligentAgent) public intelligentAgents;

    modifier onlyRouterManager() {
        require(routerManagers[msg.sender], "Only a router manager can call this function");
        _;
    }

    constructor(address _initialRouterManager) {
        routerManagers[_initialRouterManager] = true;
    }

    function addRouterManager(address _routerManager) public onlyRouterManager {
        routerManagers[_routerManager] = true;
        emit RouterManagerAdded(_routerManager);
    }

    function removeRouterManager(address _routerManager) public onlyRouterManager {
        routerManagers[_routerManager] = false;
        emit RouterManagerRemoved(_routerManager);
    }

    function addIntelligentAgent(
        address _agent,
        string memory _modelData,
        uint256 _salary,
        string memory _jobDescription
    ) public onlyRouterManager {
        intelligentAgents[_agent] = IntelligentAgent({
            modelData: _modelData,
            salary: _salary,
            jobDescription: _jobDescription,
            exists: true
        });
        emit IntelligentAgentAdded(_agent, _modelData, _salary, _jobDescription);
    }

    function updateIntelligentAgent(
        address _agent,
        string memory _modelData,
        uint256 _salary,
        string memory _jobDescription
    ) public onlyRouterManager {
        require(intelligentAgents[_agent].exists, "Intelligent agent does not exist");
        intelligentAgents[_agent].modelData = _modelData;
        intelligentAgents[_agent].salary = _salary;
        intelligentAgents[_agent].jobDescription = _jobDescription;
        emit IntelligentAgentUpdated(_agent, _modelData, _salary, _jobDescription);
    }

    function queryGPT(string memory _query) public {
        emit QuerySent(_query);
    }

    function resultGPT(string memory _result) public {
        emit ResultReceived(_result);
    }

    function distributeFunds(address payable recipient) public payable {
        require(msg.value > 0, "No funds sent");
        require(recipient != address(0), "Invalid recipient address");

        recipient.transfer(msg.value);
        emit FundsDistributed(recipient, msg.value);
    }
}
