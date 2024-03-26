## A/B Test 1
A/B Test Name: Trend Analysis Chart Preference

User Story Number: US4

Metric (from the HEART grid): Adoption/Happiness 

Hypothesis: The problem we want to solve is improving user adoption for our spending categories app. 
            Adoption refers to how effectively users engage with and utilize the app. We need to identify 
            where users drop off the most in the conversion funnel to narrow down the problem. Specifically, 
            we’ll focus on the categories analysis page. This experiment aims to determine if one type of 
            graph is more received than others and if that can improve adoption rate and happiness. Perhaps 
            there is a bottleneck in that people do not visit the trends page or visit it once and do not 
            come back. This could be the result of the chart not being appealing. This experiment aims to fix that.
            
Experiment: To visualize the data related to our hypothesis, we can consider the following chart types as experiments:
            Bar Chart, Doughnut Chart, and Pie Chart. A small group of users will each get one of the graphs 
            that showcase the same data but in different charts. After a small window of time, the graph that showcases 
            the data will change and this will continue until all users have had each graph. A survey will then be sent 
            out asking which graph was received best. Analytics will also be collected to check if there is a change in
            the number of users online for each graph to see if one is more well-received than the others.
            
Variations: The variations are as mentioned, the different types of charts. The actual data the charts are displaying will
            be the same: categories and the total spent in each. 
            
            Pie Chart: the pie chart will have each slice be represented by a category (different colored slice labels in a key 
            at the top) that show what percent of the budget is spent on each category
            
            Bar Chart: The bar chart will have, on the y-axis, the amount spent with the max being the budget and the y-axis
            will be the categories. The individual bars will be the total spent on each category so the relation between them 
            and the total budget can be seen.
            
            Doughnut Chart: This chart will be similar to the pie chart in that is represented in percentages but the center is
            cut out and may be more appealing to the users

## A/B Test 2:

A/B Test Name: Account Balance Visibility

User Story Number: US3

Metric (from the HEART grid): Daily active user

Hypothesis: We hypothesize that by prominently displaying the user's account balance on the home screen of our financial app, 
we will observe an increase in daily active users. Our analysis suggests that users often visit the app to check their account balances,
but this information is not immediately visible upon opening the app. By providing instant access to account balances without the need 
for additional navigation, we expect to improve user engagement and retention. This hypothesis is based on the understanding that 
easy access to essential financial information is crucial for users, and optimizing its visibility could lead to a higher frequency of 
app usage and overall daily activity.

Experiment:
We will conduct an A/B test where Group A will see the current app interface without the account balance displayed on the home screen,
while Group B will see an updated version of the app with the account balance prominently displayed at the top of the home screen. 
Both groups will consist of randomly selected users from our active user base. We will track the daily active users in each group over 
a period of two weeks to analyze any changes in user engagement. At the end of the experiment, we will compare the daily active user 
metrics between the two groups to determine the impact of displaying the account balance on the home screen.

Variation:
In addition to the primary variation where the account balance is displayed at the top of the home screen, we will introduce a 
secondary variation in Group B where the account balance is displayed in a larger font size and accompanied by a dynamic graph 
showing the user's account balance trend over the past month. This secondary variation aims to further enhance the visibility 
and appeal of the account balance information, potentially leading to even greater user engagement and retention. We will analyze
the impact of both variations on daily active users to determine the most effective design for improving user interaction with
account balance information.



## A/B Test 3:
A/B Test Name: Expense Category Visualization

User Story Number: US

Metric (from the HEART grid): Engagement

Hypothesis: We hypothesize that by visually representing expense categories with icons and color-coded tags within our expense tracker application, we will observe an increase in user engagement and interaction with expense tracking features. Currently, users primarily rely on textual descriptions to categorize expenses, which may lead to overlooking or misunderstanding their spending patterns. Introducing visual cues and color associations for different expense categories can make the process of categorization more intuitive and memorable, encouraging users to actively manage their expenses. This hypothesis is based on the understanding that visual stimuli can enhance user comprehension and retention of information, ultimately driving higher engagement levels.

Experiment: We will conduct an A/B test where Group A will experience the existing interface of the expense tracker application, which relies solely on textual descriptions for expense categories. In contrast, Group B will be presented with an updated version of the application where expense categories are accompanied by visually distinct icons and color-coded tags. Both groups will consist of randomly selected users from our active user base. We will track user engagement metrics, including the frequency of expense categorization and interactions with the expense tracking feature, over a period of three weeks. At the end of the experiment, we will compare the user engagement metrics between the two groups to evaluate the impact of visualizing expense categories.

Variation: In addition to the primary variation of introducing visual icons and color-coded tags for expense categories in Group B, we will introduce a secondary variation where users in Group B can customize the icons and colors associated with each expense category according to their preferences. This secondary variation aims to provide users with a personalized experience, potentially further enhancing their engagement with expense tracking. We will analyze the impact of both variations on user engagement metrics to determine the effectiveness of visualizing expense categories and the potential benefits of customization features.

## A/B Test 4:
A/B Test Name: Adding Expense Preference (With/Without Category)

User Story Number: US4

Metric (from the HEART grid): Task Success

Hypothesis: We hypothesize that providing users with the option to add expenses without categorizing them will streamline the expense tracking process, reduce friction, and improve task success rates. Currently, users are required to select a category for each expense, which may deter some from regularly using the app for quick expense entries. By simplifying the process, we expect to see an increase in the frequency of expense entries, reflecting a higher task success rate.

Experiment: We will conduct an A/B test where:

Group A: will use the current version of the app, where users are required to categorize each expense.
Group B: Will use a modified version of the app that allows users to add expenses without selecting a category, with an option to categorize later if they choose.

Variations: 
With Category Requirement (Control): In this variation, users follow the existing process of adding expenses, which includes mandatory categorization.

Without Category Requirement (Experimental): Users can add expenses without categorizing them, making the entry process quicker and potentially more appealing. They have the option to categorize expenses later, either at their convenience or not at all.

The outcomes of this test aim to inform us about user preferences regarding expense tracking flexibility and how such features impact task success, defined by the frequency and ease of expense entries.




##A/B Test 5:
A/B Test Name: Automated Budgeting Assistant vs. Manual Budget Planning

User Story Number: US5

Metric (from the HEART grid): Engagement (E)

Hypothesis:

We believe that offering an automated budget planning tool with suggestions based on spending habits (Variation B) will increase user engagement (E) compared to a traditional manual input tool (Variation A). Users might find the automated suggestions helpful and motivating, leading them to spend more time setting up and utilizing the budgeting features within the app.

Problem: Low user engagement with the existing manual budget planning tool.

Impact: Users who don't actively plan their budget might be less likely to track expenses or take advantage of the app's other financial tools.

Reasoning:  Manually entering budget categories and amounts can be time-consuming and tedious, discouraging users from engaging with the budgeting feature.

Experiment

Audience: We will allocate 50% of our user base to participate in the A/B test. This ensures we gather statistically significant data while minimizing disruption to the overall user experience. Users will be randomly assigned to either Variation A or B upon opening the finance app.

Tracking with Firebase Analytics:

Track the following events for both variations:
Time spent on the budgeting tool screen
Frequency of opening the budgeting tool screen
Number of categories created in the budget plan
Number of transactions categorized
Success Metric: We will compare the average values of the above engagement metrics between Variation A (manual) and Variation B (automated) over a period of two weeks.

Variations

Variation A: Manual Budget Planning Tool (Control)

This variation remains the current experience where users manually enter income and expense categories with their desired budget amounts.

Variation B: Automated Budget Planning Tool with Suggestions (Treatment)

This variation introduces an automated budgeting assistant. Upon opening the budgeting tool, users will see:

A prompt to connect their bank account (securely through the app) to allow the tool to analyze their spending habits.
Automated category suggestions based on their recent transactions, categorized into common spending areas (e.g., rent, groceries, entertainment, etc.). Users can edit or delete suggested categories.
Suggested budget allocations for each category based on industry averages or customizable based on user preferences. Users can adjust these suggestions.
