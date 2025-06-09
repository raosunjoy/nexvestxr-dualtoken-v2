const { Wallet } = require("ethers");
const privateKey = "305651fa1e7aa35adb8a18f2891ec9994e78b9b1cbfdafa96c6ebbed4430bd5d";
const wallet = new Wallet(privateKey);
console.log("Public Address:", wallet.address);
