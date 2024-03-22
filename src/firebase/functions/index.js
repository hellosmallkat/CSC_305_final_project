const {onRequest} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();


/**
 * Formats a Firestore timestamp into a human-readable string including the time.
 * @param {admin.firestore.Timestamp} timestamp - The Firestore timestamp to format.
 * @return {string} The formatted timestamp string including the time.
 */
function formatFirestoreTimestamp(timestamp) {
  const date = timestamp.toDate(); // Convert Firestore Timestamp to JavaScript Date object
  const optionsLong = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York", // 'EST' is not a valid IANA timeZone name
    hour12: true,
  };
  const formattedDate = new Intl.DateTimeFormat("en-US", optionsLong).format(date);

  return formattedDate;
}


/**
 * Creates a user document in Firestore when a new user is created.
 *
 * @param {Object} user - The user object containing user information.
 */
exports.createUser = functions.auth.user().onCreate(async (user) => {
  /**
   * Represents the user document data.
   *
   * @typedef {Object} UserDocumentData
   * @property {string} birthday - The user's birthday.
   * @property {string} gender - The user's gender.
   * @property {string} imageURL - The URL of the user's image.
   * @property {string} name - The user's display name.
   * @property {string} authId - The user's authentication ID.
   * @property {Array} expenses - An array of user expenses.
   */
  // Create the user document data
  const userDocumentData = {
    birthday: "",
    gender: "",
    imageURL: "",
    name: (user.email).split("@")[0],
    authId: user.uid,
    expenses: [],
  };

  try {
    // Create the user document in Firestore
    await admin.firestore().collection("users").doc(user.uid).set(userDocumentData);
    console.log(`User document created for UID: ${user.uid}`);
  } catch (error) {
    console.error("Error creating user document: ", error);
  }
});

/**
 * Retrieves a user document from Firestore based on the provided UID.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */
exports.getUser = onRequest(async (req, res) => {
  // Retrieve the UID from the query parameters
  const uid = req.query.uid;

  if (!uid) {
    res.status(400).send("UID query parameter is required");
    return;
  }

  try {
    // Fetch the user document from Firestore
    const doc = await admin.firestore().collection("users").doc(uid).get();

    if (!doc.exists) {
      res.status(404).send("User not found");
      return;
    }

    const userData = doc.data();

    // Validate and parse expenses
    const validExpenses = (userData.expenses || []).filter((expense) =>
      expense.amount && !isNaN(Number(expense.amount)) && expense.date && expense.date.toDate,
    );

    // Sort expenses by date in descending order if valid
    const sortedExpenses = validExpenses.sort((a, b) => {
      const dateA = a.date.toDate();
      const dateB = b.date.toDate();
      return dateB - dateA;
    });

    // Format the dates and calculate the total expenses
    const expensesWithConvertedDates = sortedExpenses.map((expense) => ({
      ...expense,
      amount: Number(expense.amount), // Ensure amount is a number
      date: formatFirestoreTimestamp(expense.date), // Convert Timestamp to formatted date string
    }));

    // Calculate the total amount spent on expenses
    const totalExpenses = expensesWithConvertedDates.reduce((total, expense) => total + expense.amount, 0);

    // Include the converted expenses and total amount in the response
    const userDataJSON = {
      ...userData,
      expenses: expensesWithConvertedDates,
      amountSpent: totalExpenses,
    };

    res.json(userDataJSON);
  } catch (error) {
    console.error("Error getting user document:", error);
    res.status(500).send("Internal Server Error", error);
  }
});


/**
 * Adds an expense to a user's document based on the provided UID and amount.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */
exports.addExpense = onRequest(async (req, res) => {
  // Retrieve the UID and amount from the query parameters
  const uid = req.query.uid;
  const amount = req.query.amount;

  if (!uid || !amount) {
    res.status(400).send("UID and amount query parameters are required");
    return;
  }

  try {
    // Fetch the user document from Firestore
    const docRef = admin.firestore().collection("users").doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).send("User not found");
      return;
    }

    const newExpense = {
      amount: amount,
      date: admin.firestore.Timestamp.fromDate(new Date()),
    };

    // Update the user's document with the new expense
    await docRef.update({
      expenses: admin.firestore.FieldValue.arrayUnion(newExpense),
    });

    // Send a success response including the expenses with converted dates and the total expenses
    res.json({
      message: `Expense added successfully for UID: ${uid}`,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
* Takes a JSON object storing expenses and categories and calculates 
* the total amount spent in each category and returns a list of
* categories and their totals as a list
*/

exports.catagoryTotal = functions.https.onRequest((req, res) => {
  const categories = req.body ? JSON.parse(req.body) : [];
  const uniqueCategories = [];
  const totalExpenses = [];
  categories.forEach((obj) => {
    // if not in list, add
    if (!uniqueCategories.includes(obj.category)) {
      uniqueCategories.push(obj.category);
      totalExpenses.push(obj.expense);
    // if in list find index and add cost at location
    } else {
      const index = uniqueCategories.indexOf(obj.category);
      totalExpenses[index] += obj.expense;
    }
  });
  res.send({uniqueCategories, totalExpenses});
});
