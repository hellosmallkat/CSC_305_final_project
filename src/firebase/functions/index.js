const {onRequest} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

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
   * @property {string} name - The user's display name. Defaults to "Unknown" if not provided.
   * @property {string} authId - The user's authentication ID.
   * @property {Array} expenses - An array of user expenses.
   * @property {number} expenses[].amount - The amount of the expense.
   * @property {Date} expenses[].date - The date of the expense.
   * @property {string} expenses[].category - The category of the expense.
   * @property {string} expenses[].organization - The organization associated with the expense.
   */
  // Create the user document data
  const userDocumentData = {
    birthday: "",
    gender: "",
    imageURL: "",
    name: user.displayName || "Unknown",
    authId: user.uid,
    expenses: [
      {
        amount: 100,
        date: admin.firestore.Timestamp.fromDate(new Date()),
      },
    ],
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
    } else {
      const userData = doc.data();

      // Calculate the total amount spent on expenses
      const totalExpenses = userData.expenses.reduce((total, expense) => total + Number(expense.amount), 0);

      const userDataJSON = {
        ...userData,
        amountSpent: totalExpenses,
      };
      // Send the user document data as JSON
      res.json(userDataJSON);
    }
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

    const userData = doc.data();
    const newExpense = {
      amount: amount,
      date: admin.firestore.Timestamp.fromDate(new Date()),
    };

    // Add the new expense to the user's expenses array
    const updatedExpenses = [...userData.expenses, newExpense];

    // Update the user's document with the new expenses array
    await docRef.update({
      expenses: updatedExpenses,
    });

    // Calculate the total amount spent on expenses after adding the new expense
    const totalExpenses = updatedExpenses.reduce((total, expense) => total + Number(expense.amount), 0);

    // Send a success response including the total expenses
    res.json({
      message: `Expense added successfully for UID: ${uid}`,
      totalExpenses: totalExpenses,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).send("Internal Server Error");
  }
});
