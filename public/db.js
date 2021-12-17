let db;
let budgetVersion;

// Create a new db request for a "budget" database. The second parameter is the version of the DB which will determine the schema.
const request = indexedDB.open("BudgetDB", budgetVersion || 21);
// since the DB doesnt exist it is create by the open operation and then the onupgradeneeded event is triggered and we create the database schema from the event handler.
request.onupgradeneeded = function (e) {
  console.log("Upgrade needed in IndexDB");
  // we store the event in a variable called oldVersion 0 and the newVersion, 21, in a variable.
  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);
  // Save the IDBDatabase interface
  db = e.target.result;
  // Create an objectStore for this db called BudgetStore. This means that now the onsuccess handler will bre triggered
  if (db.objectStoreNames.length === 0) {
    db.createObjectStore("BudgetStore", { autoIncrement: true });
  }
};

// if there was an error in the onupgradedneeded code then this function will handle the error. For example: trying to create an object store with a name that already exists (or trying to delete an object store with a name that does not already exist) will throw an error.
request.onerror = function (e) {
  console.log(`Woops! ${e.target.errorCode}`);
};

function checkDatabase() {
  console.log("check db invoked");

  // Open a transaction on your BudgetStore db. Before you can do anything with your new database, you need to start a transaction. Transactions come from the database object, and you have to specify which object stores you want the transaction to span. So here we are specifying that the BudgetStore object will have readwrite access (options include readonly, readwrite, and versionchange).
  let transaction = db.transaction(["BudgetStore"], "readwrite");

  // access your BudgetStore object
  const store = transaction.objectStore("BudgetStore");

  // Get all records from store and set to a variable. This should return an array - see line 31 [BudgetStore]
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      // For making a request and fetching a resource, use the fetch() method see Fetch API docs
      fetch("/api/transaction/bulk", {
        method: "POST",
        // convert js object to a JSON string
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        // the result of .json is not JSON but is instead the result of taking JSON as input and parsing it to produce a JavaScript object.
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to BudgetStore with the ability to read and write
            transaction = db.transaction(["BudgetStore"], "readwrite");

            // Assign the current store to a variable
            const currentStore = transaction.objectStore("BudgetStore");

            // Clear existing entries because our bulk add was successful
            currentStore.clear();
            console.log("Clearing store 🧹");
          }
        });
    }
  };
}

// If the onupgradeneeded event exits successfully, the onsuccess handler of the open database request will then be triggered.
request.onsuccess = function (e) {
  console.log("success");
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log("Backend online! 🗄️");
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log("Save record invoked");
  // Create a transaction on the BudgetStore db with readwrite access
  const transaction = db.transaction(["BudgetStore"], "readwrite");

  // Access your BudgetStore object store
  const store = transaction.objectStore("BudgetStore");

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener("online", checkDatabase);
