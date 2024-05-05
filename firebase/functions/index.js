const functions = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");
const OpenAI = require("openai");
const {defineString} = require("firebase-functions/params");


const openaiKey = defineString("OPENAI_KEY");


const openai = new OpenAI({
  apiKey: openaiKey.value(),
});


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
  const formattedDate = new Intl.DateTimeFormat("en-US", optionsLong).format(
      date,
  );


  return formattedDate;
}


/**
 * Creates a user document in Firestore when a new user is created.
 *
 * @param {Object} user - The user object containing user information.
 */
exports.createUser = functions.auth.user().onCreate(async (user) => {
  if (!user) {
    console.log("No user object provided");
    return;
  }
  /**
   * Represents the user document data.
   *
   * @typedef {Object} UserDocumentData
   * @property {string} birthday - The user's birthday.
   * @property {string} gender - The user's gender.
   * @property {string} imageURL - The URL of the user's image.
   * @property {string} name - The user's display name.
   * @property {string} authId - The user's authentication ID.
   * @property {integer} budget - The user's budget.
   * @property {Array} expenses - An array of user expenses.
   * @property {Array} recurringExpenses - An array of user recurring expenses.
   * @property {Array} categories - An array of user categories.
   * @property {Array} categoryTotals - An array of user category totals.
   */
  // Create the user document data


  const userDocumentData = {
    birthday: "",
    gender: "",
    imageURL: "",
    name: user.email.split("@")[0],
    authId: user.uid,
    budget: 0,
    expenses: [],
    recurringExpenses: [],
    categories: [],
    categoryTotals: [0],
    bank_auth: [{accountNumber: ""}],
  };


  try {
    // Create the user document in Firestore
    await admin
        .firestore()
        .collection("users")
        .doc(user.uid)
        .set(userDocumentData);
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
    const validExpenses = (userData.expenses || []).filter(
        (expense) =>
          expense.amount &&
        !isNaN(Number(expense.amount)) &&
        expense.date &&
        expense.date.toDate,
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


    const recurringExpenses = (userData.recurringExpenses || []).map(
        (expense) => ({
          ...expense,
          amount: Number(expense.amount), // Ensure amount is a number
          date: formatFirestoreTimestamp(expense.date), // Convert Timestamp to formatted date string
        }),
    );


    // Calculate the total amount spent on expenses
    const totalExpenses = expensesWithConvertedDates.reduce(
        (total, expense) => total + expense.amount,
        0,
    );


    // Include the converted expenses and total amount in the response
    const userDataJSON = {
      ...userData,
      expenses: expensesWithConvertedDates,
      // round amountSpent to 2 decimal places
      amountSpent: Math.round(totalExpenses * 100) / 100,
      recurringExpenses: recurringExpenses,
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
  // Retrieve the UID, amount, and store from the query parameters
  const uid = req.query.uid;
  const amount = req.query.amount;
  const store = req.query.store;


  if (!uid || !amount || !store) {
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
      store: store,
    };


    // Update the user's document with the new expense
    await docRef.update({
      expenses: admin.firestore.FieldValue.arrayUnion(newExpense),
    });


    // Add a user's UID to the "metrics/CTR/users-completed-golden-path" array if it's not already present
    await metricCompleteGoldenPathIfHasNot(uid);


    // Send a success response including the expenses with converted dates and the total expenses
    res.json({
      message: `Expense added successfully for UID: ${uid}`,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).send("Internal Server Error");
  }
});


// function to allow user to add catagories to database
exports.addCategories = onRequest(async (req, res) => {
  // Retrieve the UID and categories from the query parameters
  const uid = req.query.uid;
  let categories = req.query.category;

  if (!uid || !categories) {
    res.status(400).send("UID and categories query parameters are required");
    return;
  }

  try {
    categories = JSON.parse(categories); // Convert JSON string to array

    const docRef = admin.firestore().collection("users").doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).send("User not found");
      return;
    }

    await docRef.update({
      categories: admin.firestore.FieldValue.arrayUnion(...categories),
      categoryTotals: admin.firestore.FieldValue.arrayUnion(
          ...Array(categories.length).fill(0),
      ),
    });

    res.json({
      message: `Categories added successfully for UID: ${uid}`,
    });
  } catch (error) {
    console.error("Error adding categories:", error);
    res.status(500).send("Internal Server Error");
  }
});


// updates the amount the user spent in each category
exports.setCategoryTotals = onRequest(async (req, res) => {
  // Retrieve the UID and category totals from the query parameters
  const uid = req.query.uid;
  const categoryTotals = req.query.categoryTotals;


  if (!uid || !categoryTotals) {
    res
        .status(400)
        .send("UID and category totals query parameters are required");
    return;
  }


  // Convert categoryTotals to an array of numbers
  const categoryTotalsArray = categoryTotals.split(",").map(Number);


  try {
    // Fetch the user document from Firestore
    const docRef = admin.firestore().collection("users").doc(uid);
    const doc = await docRef.get();


    if (!doc.exists) {
      res.status(404).send("User not found");
      return;
    }


    // Overwrite the user's document with the new category totals
    await docRef.update({
      categoryTotals: categoryTotalsArray,
    });


    // Send a success response
    res.json({
      message: `Category totals set successfully for UID: ${uid}`,
    });
  } catch (error) {
    console.error("Error setting category totals:", error);
    res.status(500).send("Internal Server Error");
  }
});


/**
 * Adds a user's UID to the "metrics/CTR/users-completed-golden-path" array if it's not already present.
 */
/**
 * Completes the golden path metric if the user has not already completed it.
 * @param {string} uid - The user ID.
 * @return {Promise<void>} - A promise that resolves when the metric is completed.
 * @throws {Error} - If the metrics document does not exist or if there is an error updating the metrics document.
 */
async function metricCompleteGoldenPathIfHasNot(uid) {
  try {
    const metricsDocRef = admin.firestore().collection("metrics").doc("CTR");
    const doc = await metricsDocRef.get();


    if (!doc.exists) {
      throw new Error("Document does not exist");
    }


    const usersCompletedGoldenPath = doc.data().usersCompletedGoldenPath || [];


    if (usersCompletedGoldenPath.includes(uid)) {
      return;
    }


    await metricsDocRef.update({
      usersCompletedGoldenPath: admin.firestore.FieldValue.arrayUnion(uid),
    });
  } catch (error) {
    console.error("Error updating metrics document:", error);
    throw error;
  }
}


// adds NPS metric to the database
exports.addRating = onRequest(async (req, res) => {
  // gets user rating
  const rating = req.query.rating;


  if (!rating || rating < 1 || rating > 10) {
    res
        .status(400)
        .send(
            "rating query parameter is required and should be between 1 and 10",
        );
    return;
  }
  try {
    const metricsDocRef = admin.firestore().collection("metrics").doc("NPS");
    const doc = await metricsDocRef.get();


    if (!doc.exists) {
      throw new Error("Document does not exist");
    }


    await metricsDocRef.update({
      ratings: admin.firestore.FieldValue.arrayUnion(rating),
    });


    res.status(200).send("Rating added successfully");
  } catch (error) {
    console.error("Error updating metrics document:", error);
    res.status(500).send("Error updating metrics document");
  }
});


// function to add a recurring expense
exports.addSubscription = onRequest(async (req, res) => {
  // Get the parameters from the request
  const uid = req.query.uid;
  const store = req.query.store;
  const date = req.query.date;
  const amount = req.query.amount;
  const category = req.query.category;


  if (!uid || !amount || !store || !date || !category) {
    console.log("parameters are required");
    res.status(400).send("parameters are required");
    return;
  }


  try {
    // Fetch the user document from Firestore
    const docRef = admin.firestore().collection("users").doc(uid);
    const doc = await docRef.get();


    if (!doc.exists) {
      console.log("User not found");
      res.status(404).send("User not found");
      return;
    }


    // Convert the date from MM/DD/YYYY to the desired format with a constant time stamp of 11:59:00 PM
    const dateParts = date.split("/");
    const newDate = new Date(
        dateParts[2],
        dateParts[0] - 1,
        Number(dateParts[1]) + 1,
        3,
        59,
    );


    // Create a new subscription object
    const newSubsciption = {
      store: store,
      date: admin.firestore.Timestamp.fromDate(newDate),
      amount: amount,
      category: category,
    };


    // Update the user's document with the new subscription
    await docRef.update({
      recurringExpenses: admin.firestore.FieldValue.arrayUnion(newSubsciption),
    });

    console.log(`subscription added successfully for UID: ${uid}`);

    res.json({
      message: `subscription added successfully for UID: ${uid}`,
    });
  } catch (error) {
    console.error("Error adding subscription:", error);
    res.status(500).send("Internal Server Error");
  }
});


// checks is any recurring expense payments were do and if so add them to expense list
exports.checkRecurringExpenses = onRequest(async (req, res) => {
  // Get the UID from the query
  const uid = req.query.uid;


  // Check if the UID is provided
  if (!uid) {
    res.status(400).send("UID is required");
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


    // get user data
    const user = doc.data();
    const recurringExpenses = user.recurringExpenses || [];
    const expenses = user.expenses || [];
    const currentDate = new Date();
    const categories = user.categories || [];
    const categoryTotals = user.categoryTotals || [];


    // convert categories and categoryTotals to arrays
    const catArray = [];
    const catTotals = [];


    for (const category of categories) {
      catArray.push(category);
    }
    for (const total of categoryTotals) {
      catTotals.push(parseInt(total));
    }


    // check for overdue expenses
    const overdueExpenses = recurringExpenses.filter((expense) => {
      return expense.date.toDate() < currentDate;
    });


    for (const expense of overdueExpenses) {
      const {store, date, amount, category} = expense;


      if (!expenses.find((exp) => exp.store === store && exp.date === date)) {
        // add expense to expenses
        const newExpense = {
          amount: amount,
          date: date,
          store: store,
        };


        await docRef.update({
          expenses: admin.firestore.FieldValue.arrayUnion(newExpense),
          recurringExpenses: admin.firestore.FieldValue.arrayRemove(expense),
        });


        // set subscription for next month
        const jsDate = date.toDate(); // Convert Firestore timestamp to JavaScript Date
        const month = jsDate.getMonth();
        const day = jsDate.getDate();
        const year = jsDate.getFullYear();


        const newDate = new Date(year, month + 1, day, 3, 59);
        expense.date = admin.firestore.Timestamp.fromDate(newDate);


        await docRef.update({
          recurringExpenses: admin.firestore.FieldValue.arrayUnion(expense),
        });


        // update category totals
        catTotals[catArray.indexOf(category)] += parseInt(amount);


        await docRef.update({
          categoryTotals: catTotals,
        });
      }
    }
    res.json({
      message: `Checked recurring expenses for UID: ${uid}`,
      overdueExpenses: overdueExpenses,
    });
  } catch (error) {
    console.error("Error checking recurring expenses:", error);
    res.status(500).send("Internal Server Error");
  }
});


// function to add profile information to the database
exports.addUserData = onRequest(async (req, res) => {
  // get the query parameters
  const uid = req.query.uid;
  const userName = req.query.userName;
  const birthday = req.query.birthday;
  const budget = req.query.budget;
  const gender = req.query.gender;


  if (!uid) {
    res.status(400).send("UID query parameter is required");
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


    // Update the user document with the new data
    await docRef.update({
      name: userName,
      birthday: birthday,
      gender: gender,
      budget: budget,
    });


    res.json({
      message: "User data updated successfully",
    });
  } catch (error) {
    console.error("Error getting user document:", error);
    res.status(500).send("Internal Server Error", error);
  }
});


// function to sort list based on user input
exports.sortList = onRequest(async (req, res) => {
  // get the query parameters
  const uid = req.query.uid;
  const sortType = req.query.sortType;
  const list = req.query.list;


  if (!uid) {
    res.status(400).send("UID query parameter is required");
    return;
  }


  // Fetch the user document from Firestore
  const doc = await admin.firestore().collection("users").doc(uid).get();


  if (!doc.exists) {
    res.status(404).send("User not found");
    return;
  }


  const user = doc.data();


  // sort the list based on the user input
  if (list === "subscriptions") {
    if (sortType === "price") {
      user.recurringExpenses.sort((a, b) => b.amount - a.amount);
    } else if (sortType === "name") {
      user.recurringExpenses.sort((a, b) => a.store.localeCompare(b.store));
    } else if (sortType === "date") {
      user.recurringExpenses.sort((a, b) => a.date.toDate() - b.date.toDate());
    } else {
      res.status(400).send("Invalid sort type");
      return;
    }
  } else if (list === "transactions") {
    if (sortType === "price") {
      user.expenses.sort((a, b) => b.amount - a.amount);
    } else if (sortType === "name") {
      user.expenses.sort((a, b) => a.store.localeCompare(b.store));
    } else if (sortType === "date") {
      user.expenses.sort((a, b) => a.date.toDate() - b.date.toDate());
    } else {
      res.status(400).send("Invalid sort type");
      return;
    }
  } else {
    res.status(400).send("Invalid list type");
    return;
  }


  // Update the user document with the new sorted list
  await admin.firestore().collection("users").doc(uid).update({
    recurringExpenses: user.recurringExpenses,
    expenses: user.expenses,
  });


  // Send the response
  res.json({
    message: "List sorted successfully",
  });
});


// function to read receipt details
// takes in an image of a receipt
// returns unparsed information


exports.onAddExpenseFromReceiptHandler = functions.storage
    .object()
    .onFinalize(async (object) => {
      console.log("onAddExpenseFromReceiptHandler Function start");


      const imageBucket = `gs://${object.bucket}/${object.name}`;
      const uid = object.name.split("/")[0];
      console.log(`Processing file: ${object.name}`);


      const client = new vision.ImageAnnotatorClient();


      // Start Vision API processing
      console.log("Vision API processing start");
      const [textDetections] = await client.textDetection(imageBucket);
      const [annotation] = textDetections.textAnnotations;
      console.log("Vision API processing end");


      const receiptInformation = annotation ? annotation.description : "";
      if (receiptInformation === "") {
        console.log("No text found in image");
        return;
      }


      // Firestore read operation
      console.log("Firestore read start");
      const userDoc = await admin.firestore().collection("users").doc(uid).get();


      const userData = userDoc.data();
      const expenseCategories = userData.categories || [];
      console.log("Firestore read end");


      const prompt = `
      My Receipt:
      ${receiptInformation}


      Here are all my categories:
      ${expenseCategories.map((category) => `- ${category}`).join("\n")}


      Please identify the total amount from the receipt, which may be listed next to labels such as 'TOTAL', 'VISA', or 'CREDIT'. Once found, determine the store and the appropriate category. Format your response with the store name, category, and total amount (without the dollar sign in front of it) as follows:
      {store}, {category}, {amount}
      
      If the receipt information does not contain what a receipt should contain, please respond with "CANCEL".
      `;


      // OpenAI processing
      console.log("OpenAI processing start");
      const completion = await openai.chat.completions.create({
        messages: [{role: "system", content: prompt}],
        model: "gpt-3.5-turbo",
      });


      const chatGPTOutput = completion.choices[0].message.content.split(",");
      console.log("OpenAI processing end");

      if (chatGPTOutput[0] === "CANCEL") {
        console.log("Receipt information does not contain what a receipt should contain, canceling function");
        return;
      }

      const store = chatGPTOutput[0] || "";
      const expenseCategory = chatGPTOutput[1] || "";
      const amount = chatGPTOutput[2] || "";


      if (!store || !expenseCategory || !amount) {
        console.log("Invalid response, canceling function");
        return;
      }


      const categoryToAdd = expenseCategory.trim();


      // Firestore write operation
      console.log("Adding receipt's expense to user's document");
      if (!expenseCategories.includes(categoryToAdd)) {
        await admin.firestore().collection("users").doc(uid).update({
          categories: admin.firestore.FieldValue.arrayUnion(categoryToAdd),
          categoryTotals: admin.firestore.FieldValue.arrayUnion(0),
        });
        console.log("Added category to user's document");
      } else {
        // Add expense to user's document
        const newExpense = {
          amount: amount,
          date: admin.firestore.Timestamp.fromDate(new Date()),
          store: store,
        };

        await admin.firestore().collection("users").doc(uid).update({
          expenses: admin.firestore.FieldValue.arrayUnion(newExpense),
        });
        console.log("Added expense to user's document");
      }
    });


exports.generateExpenseReport = onRequest(async (req, res) => {
  // get the query parameters
  const uid = req.query.uid;


  if (!uid) {
    res.status(400).send("UID query parameter is required");
    return;
  }


  // Fetch the user document from Firestore
  const doc = await admin.firestore().collection("users").doc(uid).get();


  if (!doc.exists) {
    res.status(404).send("User not found");
    return;
  }


  const user = doc.data();


  // User Details
  const userName = user.name;


  // Expense Report Data
  const reportGeneratedDate = admin.firestore.Timestamp.fromDate(new Date());
  const budget = user.budget;
  const categories = user.categories || [];
  const categoryTotals = user.categoryTotals || [];
  const expenses = user.expenses || [];


  // Create a new document in the expense-reports collection with the user details and expense report data
  const reportData = {
    userName: userName,
    reportGeneratedDate: reportGeneratedDate,
    budget: budget,
    categories: categories,
    categoryTotals: categoryTotals,
    expenses: expenses,
  };


  await admin.firestore().collection("expense-reports").collection(uid).add(reportData);


  // Send the response
  res.json({
    message: "Expense report generated successfully",
  });
});

exports.generateTips = onRequest(async (req, res) => {
  console.log("req: ", req);
  // get the query parameters
  const uid = req.query.uid;
  if (!uid) {
    console.log("UID query parameter is required");
    res.status(400).send("UID query parameter is required");
    return;
  }
  console.log("body:", req.body);
  const tipRequest = req.body.tipRequest;
  if (!tipRequest) {
    console.log("Tip request is required");
    res.status(400).send("Tip request is required");
    return;
  }
  // Fetch the user document from Firestore
  const doc = await admin.firestore().collection("users").doc(uid).get();
  if (!doc.exists) {
    console.log("User not found");
    res.status(404).send("User not found");
    return;
  }
  const user = doc.data();
  const categories = user.categories || [];
  const categoryTotals = user.categoryTotals || [];
  const expenses = user.expenses || [];
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  const totalBudget = user.budget;
  const remainingBudget = totalBudget - totalExpenses;

  const prompt = `
    My Budget: $${totalBudget}
    My Expenses: $${totalExpenses}
    Remaining Budget: $${remainingBudget}
    My Categories:
    ${categories.map((category) => `- ${category}`).join("\n")}
    My Category Totals:
    ${categories.map((category, index) => `- ${category}: $${categoryTotals[index]}`).join("\n")}
    Using the data above and the ask asked below, please provide a tip for me to better manage my expenses.
    My Ask: "${tipRequest}"
    If any question is asked that is unrelated to expense tips or if the question is inappropriate, please respond with "I'm sorry, I cannot provide an answer for that ask."
    Make sure to respond in a clear and concise manner and within 2 sentences. 
  `;
  // OpenAI processing
  const completion = await openai.chat.completions.create({
    messages: [{role: "system", content: prompt}],
    model: "gpt-3.5-turbo",
  });
  const tip = completion.choices[0].message.content;
  // Send the response
  res.json({
    tip: tip,
  });
});


// Email Function
exports.userWelcomeMail = functions.auth.user().onCreate((user) => {
  admin.firestore().collection("mail").add({
    "to": [user.email],
    "message": {
      "subject": "Welcome to Expense Tracker! Explore functionalities here.",
      "text": `Hi. \n\nIt's nice to have you on-board.`,
      "html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Expense Tracker</title>
  </head>
<body>
<h1>Hi user,</h1>
<p>Welcome to Expense Tracker, your one-stop shop for taking charge of your finances! We're thrilled to have you on board and excited to help you manage your money with ease.</p>




<h2>What You Can Do with Expense Tracker:</h2>
<ul>
  <li>Track Every Penny: Effortlessly log your expenses with details and categorize them for a clear picture of where your money goes.</li>
  <li>Stay Secure: Rest assured, your financial data is protected. Login is required to access your information, keeping your privacy a priority.</li>
  <li>Organize Your Way: Create custom categories and recurring expenses for a system that works for you.</li>
  <li>Visualize Your Spending: See your expenses beautifully represented in pie charts, making budgeting and financial planning a breeze.</li>
  <li>Scan and Save: Skip the manual entry hassle! Use your phone's camera to scan receipts and instantly add those expenses to your tracker (feature under development).</li>
</ul>




<h2>What's Coming Soon:</h2>
<p>We're constantly working to improve your experience! Here's a sneak peek at some exciting features on the horizon:</p>
<ul>
  <li>Budgeting Made Easy: Set up and monitor your budget, with helpful alerts to keep you on track and avoid overspending.</li>
  <li>Say Goodbye to Manual Entry: Connect your credit cards to automatically import transactions and save precious time. </li>
  <li>Travel Like a Pro: Track international expenses with ease. Multi-currency support is coming soon!</li>
  <li>Unlock Your Spending Habits: Gain valuable insights with reports and personalized analysis to optimize your financial future.</li>
</ul>




  <h2>Get Started:</h2>
<p>Start your journey to financial freedom! Download Expense Tracker on the App Store or Google Play.</p>
<p>We're here to help you every step of the way. If you have any questions, don't hesitate to contact our support team at <a href="mailto:[Support Email Address]">expensetracker180@gmail.com</a>.</p>




<p>Happy Tracking!</p>
<p>The Expense Tracker Team</p>




  </body>
</html>`,
    },
  })
      .then((result) => {
        console.log(
            "onboarding email result: ", result,
            "\ntime-stamp: ", Date.now);
      });
});
