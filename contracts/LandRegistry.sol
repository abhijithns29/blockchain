// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract LandRegistry {
    struct Property {
        uint256 id;
        string ipfsHash;
        address owner;
        string location;
        uint256 size;
        uint256 valuation;
        PropertyStatus status;
        uint256 registrationDate;
        bool isVerified;
    }
    
    struct Transaction {
        uint256 propertyId;
        address from;
        address to;
        TransactionType transactionType;
        uint256 amount;
        uint256 timestamp;
        bool isApproved;
        string certificateHash;
    }
    
    enum PropertyStatus { AVAILABLE, FOR_SALE, FOR_RENT, SOLD, RENTED }
    enum TransactionType { REGISTRATION, SALE, RENT, TRANSFER }
    
    mapping(uint256 => Property) public properties;
    mapping(uint256 => Transaction[]) public propertyTransactions;
    mapping(address => uint256[]) public ownerProperties;
    mapping(address => bool) public admins;
    
    uint256 public propertyCounter;
    uint256 public transactionCounter;
    address public owner;
    
    event PropertyRegistered(uint256 indexed propertyId, address indexed owner, string location);
    event TransactionInitiated(uint256 indexed transactionId, uint256 indexed propertyId, address indexed from, address to);
    event TransactionApproved(uint256 indexed transactionId, uint256 indexed propertyId);
    event OwnershipTransferred(uint256 indexed propertyId, address indexed from, address indexed to);
    
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Only admin can perform this action");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can perform this action");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }
    
    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
    }
    
    function removeAdmin(address _admin) external onlyOwner {
        admins[_admin] = false;
    }
    
    function registerProperty(
        address _owner,
        string memory _ipfsHash,
        string memory _location,
        uint256 _size,
        uint256 _valuation
    ) external onlyAdmin returns (uint256) {
        propertyCounter++;
        
        properties[propertyCounter] = Property({
            id: propertyCounter,
            ipfsHash: _ipfsHash,
            owner: _owner,
            location: _location,
            size: _size,
            valuation: _valuation,
            status: PropertyStatus.AVAILABLE,
            registrationDate: block.timestamp,
            isVerified: true
        });
        
        ownerProperties[_owner].push(propertyCounter);
        
        // Create registration transaction
        Transaction memory newTransaction = Transaction({
            propertyId: propertyCounter,
            from: address(0),
            to: _owner,
            transactionType: TransactionType.REGISTRATION,
            amount: _valuation,
            timestamp: block.timestamp,
            isApproved: true,
            certificateHash: ""
        });
        
        propertyTransactions[propertyCounter].push(newTransaction);
        
        emit PropertyRegistered(propertyCounter, _owner, _location);
        return propertyCounter;
    }
    
    function initiateTransaction(
        uint256 _propertyId,
        address _to,
        TransactionType _type,
        uint256 _amount
    ) external returns (uint256) {
        require(_propertyId <= propertyCounter, "Property does not exist");
        require(properties[_propertyId].owner == msg.sender, "Only property owner can initiate transaction");
        
        transactionCounter++;
        
        Transaction memory newTransaction = Transaction({
            propertyId: _propertyId,
            from: msg.sender,
            to: _to,
            transactionType: _type,
            amount: _amount,
            timestamp: block.timestamp,
            isApproved: false,
            certificateHash: ""
        });
        
        propertyTransactions[_propertyId].push(newTransaction);
        
        emit TransactionInitiated(transactionCounter, _propertyId, msg.sender, _to);
        return transactionCounter;
    }
    
    function approveTransaction(
        uint256 _propertyId,
        uint256 _transactionIndex,
        string memory _certificateHash
    ) external onlyAdmin {
        require(_propertyId <= propertyCounter, "Property does not exist");
        require(_transactionIndex < propertyTransactions[_propertyId].length, "Transaction does not exist");
        
        Transaction storage transaction = propertyTransactions[_propertyId][_transactionIndex];
        require(!transaction.isApproved, "Transaction already approved");
        
        transaction.isApproved = true;
        transaction.certificateHash = _certificateHash;
        
        // Update property ownership if it's a sale or transfer
        if (transaction.transactionType == TransactionType.SALE || transaction.transactionType == TransactionType.TRANSFER) {
            // Remove property from current owner
            _removePropertyFromOwner(properties[_propertyId].owner, _propertyId);
            
            // Add property to new owner
            ownerProperties[transaction.to].push(_propertyId);
            
            // Update property owner
            properties[_propertyId].owner = transaction.to;
            properties[_propertyId].status = PropertyStatus.AVAILABLE;
            
            emit OwnershipTransferred(_propertyId, transaction.from, transaction.to);
        } else if (transaction.transactionType == TransactionType.RENT) {
            properties[_propertyId].status = PropertyStatus.RENTED;
        }
        
        emit TransactionApproved(_transactionIndex, _propertyId);
    }
    
    function updatePropertyStatus(uint256 _propertyId, PropertyStatus _status) external {
        require(_propertyId <= propertyCounter, "Property does not exist");
        require(properties[_propertyId].owner == msg.sender || admins[msg.sender], "Not authorized");
        
        properties[_propertyId].status = _status;
    }
    
    function getProperty(uint256 _propertyId) external view returns (Property memory) {
        require(_propertyId <= propertyCounter, "Property does not exist");
        return properties[_propertyId];
    }
    
    function getPropertyTransactions(uint256 _propertyId) external view returns (Transaction[] memory) {
        require(_propertyId <= propertyCounter, "Property does not exist");
        return propertyTransactions[_propertyId];
    }
    
    function getOwnerProperties(address _owner) external view returns (uint256[] memory) {
        return ownerProperties[_owner];
    }
    
    function _removePropertyFromOwner(address _owner, uint256 _propertyId) internal {
        uint256[] storage properties = ownerProperties[_owner];
        for (uint256 i = 0; i < properties.length; i++) {
            if (properties[i] == _propertyId) {
                properties[i] = properties[properties.length - 1];
                properties.pop();
                break;
            }
        }
    }
}