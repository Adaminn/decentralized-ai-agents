// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GPTQueryContract {

    event QuerySent(string query);

    event ResultReceived(string result);

    function queryGPT(string memory _query) public {
        emit QuerySent(_query);
    }

    function resultGPT(string memory _result) public {
        emit ResultReceived(_result);
    }
}