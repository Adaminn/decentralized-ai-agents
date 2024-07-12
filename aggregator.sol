// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Router {
    
    event QuerySent(string query);
    event ResultReceived(string result);
    event FundsDistributed(address indexed recipient, uint256 amount);

    address public intelligentAgent;
    address public routerManager;

    modifier onlyRouterManager() {
        require(msg.sender == routerManager, "Only the router manager can call this function");
        _;
    }

    constructor(address _routerManager) {
        routerManager = _routerManager;
    }

    function setIntelligentAgent(address _intelligentAgent) public onlyRouterManager {
        intelligentAgent = _intelligentAgent;
    }

    function setRouterManager(address _routerManager) public onlyRouterManager {
        routerManager = _routerManager;
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
