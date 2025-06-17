// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Advanced Reentrancy Guard
 * @dev Contract module that helps prevent reentrant calls to a function.
 * Enhanced version with additional security features
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or bytes32, but this is
    // more readable and we save on gas by packing multiple state variables
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private constant _LOCKED = 3; // Additional lock state

    uint256 private _status;
    uint256 private _lockCounter; // Counter for nested lock detection
    
    // Mapping to track function-specific locks
    mapping(bytes4 => uint256) private _functionStatus;
    
    // Events for monitoring
    event ReentrancyAttempted(address indexed caller, bytes4 indexed selector);
    event FunctionLocked(bytes4 indexed selector, address indexed caller);
    event FunctionUnlocked(bytes4 indexed selector, address indexed caller);

    constructor() {
        _status = _NOT_ENTERED;
        _lockCounter = 0;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev Function-specific reentrancy guard
     * Prevents reentrancy on a per-function basis
     */
    modifier nonReentrantFunction() {
        bytes4 selector = msg.sig;
        _functionNonReentrantBefore(selector);
        _;
        _functionNonReentrantAfter(selector);
    }

    /**
     * @dev Advanced guard that also prevents cross-function reentrancy
     * between specific sensitive functions
     */
    modifier nonReentrantAdvanced() {
        _advancedNonReentrantBefore();
        _;
        _advancedNonReentrantAfter();
    }

    /**
     * @dev Read-only functions that are safe from reentrancy
     * but still need protection from state changes during execution
     */
    modifier readOnlyReentrantGuard() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call during read");
        _;
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be _NOT_ENTERED
        if (_status == _ENTERED) {
            emit ReentrancyAttempted(msg.sender, msg.sig);
            revert("ReentrancyGuard: reentrant call");
        }

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;
        _lockCounter++;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _lockCounter--;
        if (_lockCounter == 0) {
            _status = _NOT_ENTERED;
        }
    }

    function _functionNonReentrantBefore(bytes4 selector) private {
        // Check global reentrancy status
        require(_status != _ENTERED, "ReentrancyGuard: global reentrant call");
        
        // Check function-specific reentrancy
        if (_functionStatus[selector] == _ENTERED) {
            emit ReentrancyAttempted(msg.sender, selector);
            revert("ReentrancyGuard: function reentrant call");
        }

        _functionStatus[selector] = _ENTERED;
        emit FunctionLocked(selector, msg.sender);
    }

    function _functionNonReentrantAfter(bytes4 selector) private {
        _functionStatus[selector] = _NOT_ENTERED;
        emit FunctionUnlocked(selector, msg.sender);
    }

    function _advancedNonReentrantBefore() private {
        // Enhanced checks for complex reentrancy patterns
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        require(_status != _LOCKED, "ReentrancyGuard: function locked");
        
        // Check for nested calls
        require(_lockCounter == 0, "ReentrancyGuard: nested call detected");

        _status = _ENTERED;
        _lockCounter++;
    }

    function _advancedNonReentrantAfter() private {
        _lockCounter--;
        if (_lockCounter == 0) {
            _status = _NOT_ENTERED;
        }
    }

    /**
     * @dev Emergency lock function (can only be called internally)
     * Locks all functions until manually unlocked
     */
    function _emergencyLock() internal {
        _status = _LOCKED;
    }

    /**
     * @dev Emergency unlock function (can only be called internally)
     */
    function _emergencyUnlock() internal {
        _status = _NOT_ENTERED;
        _lockCounter = 0;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered"
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == _ENTERED;
    }

    /**
     * @dev Returns the current lock counter
     */
    function _getLockCounter() internal view returns (uint256) {
        return _lockCounter;
    }

    /**
     * @dev Returns the status of a specific function
     */
    function _getFunctionStatus(bytes4 selector) internal view returns (uint256) {
        return _functionStatus[selector];
    }

    /**
     * @dev Check if the contract is in emergency lock state
     */
    function _isEmergencyLocked() internal view returns (bool) {
        return _status == _LOCKED;
    }
}