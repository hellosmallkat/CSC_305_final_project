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
   * changes made here
   * @property {Array} categories - An array of user categories.
   * @property {Array} categoryTotals - An array of user category totals.
   */
  // Create the user document data
  const userDocumentData = {
    birthday: "",
    gender: "",
    imageURL: "",
    name: (user.email).split("@")[0],
    authId: user.uid,
    expenses: [],
    categories: [],
    categoryTotals: [],
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

// MA - 3/24/24 - added these functions to add/get categories and category totals to/from the database

/**
 * Adds categories to a user's document based on the provided UID and categories.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */

exports.addCategories = onRequest(async (req, res) => {
  // Retrieve the UID and categories from the query parameters
  const uid = req.query.uid;
  const categories = req.query.categories;

  if (!uid || !categories) {
    res.status(400).send("UID and categories query parameters are required");
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

    // Update the user's document with the new categories
    await docRef.update({
      categories: admin.firestore.FieldValue.arrayUnion(...categories),
    });

    // Send a success response
    res.json({
      message: `Categories added successfully for UID: ${uid}`,
    });
  } catch (error) {
    console.error("Error adding categories:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * Adds category totals to a user's document based on the provided UID and category totals.
 * 
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */

exports.addCategoryTotals = onRequest(async (req, res) => {
  // Retrieve the UID and category totals from the query parameters
  const uid = req.query.uid;
  const categoryTotals = req.query.categoryTotals;

  if (!uid || !categoryTotals) {
    res.status(400).send("UID and category totals query parameters are required");
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

    // Update the user's document with the new category totals
    await docRef.update({
      categoryTotals: admin.firestore.FieldValue.arrayUnion(...categoryTotals),
    });

    // Send a success response
    res.json({
      message: `Category totals added successfully for UID: ${uid}`,
    });
  } catch (error) {
    console.error("Error adding category totals:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
  * Retrieves a user's categories from Firestore based on the provided UID.
  *
  * @param {Object} req - The HTTP request object.
  * @param {Object} res - The HTTP response object.
  */

exports.getCategories = onRequest(async (req, res) => {
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

    // Validate and parse categories
    const validCategories = (userData.categories || []).filter((category) =>
      category,
    );

    // Include the converted categories in the response
    const userDataJSON = {
      ...userData,
      categories: validCategories,
    };

    res.json(userDataJSON);
  } catch (error) {
    console.error("Error getting user document:", error);
    res.status(500).send("Internal Server Error", error);
  }
});

/**
  * Retrieves a user's category totals from Firestore based on the provided UID.
  *
  * @param {Object} req - The HTTP request object.
  * @param {Object} res - The HTTP response object.
  */

exports.getCategoryTotals = onRequest(async (req, res) => {
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

    // Validate and parse category totals
    const validCategoryTotals = (userData.categoryTotals || []).filter((categoryTotal) =>
      categoryTotal,
    );

    // Include the converted category totals in the response
    const userDataJSON = {
      ...userData,
      categoryTotals: validCategoryTotals,
    };

    res.json(userDataJSON);
  } catch (error) {
    console.error("Error getting user document:", error);
    res.status(500).send("Internal Server Error", error);
  }
});

/**
 * Adds a user's UID to the "metrics/CTR/users-completed-golden-path" array if it's not already present.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */
exports.metricCompleteGoldenPathIfHasNot = onRequest(async (req, res) => {
  // Retrieve the UID from the query parameters
  const uid = req.query.uid;

  if (!uid) {
    res.status(400).send("UID query parameter is required");
    return;
  }

  const metricsDocRef = admin.firestore().collection("metrics").doc("CTR");

  try {
    // Fetch the current data from the metrics document
    const doc = await metricsDocRef.get();
    let usersCompletedGoldenPath = [];

    if (doc.exists && doc.data().usersCompletedGoldenPath) {
      usersCompletedGoldenPath = doc.data().usersCompletedGoldenPath;
    }

    // Check if the UID is already in the array to avoid duplicates
    if (usersCompletedGoldenPath.includes(uid)) {
      res.json({ message: "UID already registered in the golden path completion list." });
      return;
    }

    // Add the UID to the array
    await metricsDocRef.update({
      "usersCompletedGoldenPath": admin.firestore.FieldValue.arrayUnion(uid),
    });

    res.json({ message: `UID: ${uid} added to the golden path completion list successfully.` });
  } catch (error) {
    console.error("Error updating metrics document:", error);
    res.status(500).send("Internal Server Error");
  }
});
