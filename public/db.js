let db;
let budgetVersion;

// Create a new db request for a "budget" db
const request = indexedDB.open('offlineBudgetDB', offlineBudgetVersion || 21);

request.onupgradeneeded = 