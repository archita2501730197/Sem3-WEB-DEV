// Import custom isEven module
const isEven = require("./modules/isEven");

console.log("=== Custom Module Creation & Reusability ===");

// Example 1
console.log("2 is even:", isEven(2));

// Example 2
console.log("7 is even:", isEven(7));

// Example 3
console.log("10 is even:", isEven(10));

// Example 4
console.log("130 is even:", isEven(130));