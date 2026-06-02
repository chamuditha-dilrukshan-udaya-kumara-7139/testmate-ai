import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const savedTestCasesByUser = new Map();

const templates = {
  login: [
    {
      scenario: "Verify that a user can log in with valid credentials",
      steps: [
        "Open the login page",
        "Enter a registered email address",
        "Enter the correct password",
        "Click the login button"
      ],
      expectedResult: "User is authenticated and redirected to the dashboard.",
      priority: "High"
    },
    {
      scenario: "Verify that invalid login credentials are rejected",
      steps: [
        "Open the login page",
        "Enter an unregistered email address or incorrect password",
        "Click the login button"
      ],
      expectedResult: "System displays a clear authentication error and keeps the user on the login page.",
      priority: "High"
    },
    {
      scenario: "Verify required validation on the login form",
      steps: [
        "Open the login page",
        "Leave email and password fields empty",
        "Click the login button"
      ],
      expectedResult: "System prevents submission and shows required field validation messages.",
      priority: "Medium"
    }
  ],
  register: [
    {
      scenario: "Verify that a new user can register with valid details",
      steps: [
        "Open the registration page",
        "Enter a valid name, email, and password",
        "Submit the registration form"
      ],
      expectedResult: "Account is created successfully and the user can access the application.",
      priority: "High"
    },
    {
      scenario: "Verify duplicate email validation during registration",
      steps: [
        "Open the registration page",
        "Enter an email address that is already registered",
        "Complete all other required fields",
        "Submit the form"
      ],
      expectedResult: "System rejects the request and displays a duplicate email message.",
      priority: "High"
    },
    {
      scenario: "Verify registration form required field validation",
      steps: [
        "Open the registration page",
        "Leave one or more required fields empty",
        "Submit the form"
      ],
      expectedResult: "System prevents account creation and highlights missing required fields.",
      priority: "Medium"
    }
  ],
  payment: [
    {
      scenario: "Verify successful payment with valid card details",
      steps: [
        "Open the payment checkout page",
        "Enter valid card and billing details",
        "Submit the payment"
      ],
      expectedResult: "Payment is processed successfully and confirmation is shown.",
      priority: "High"
    },
    {
      scenario: "Verify failed payment handling for declined card",
      steps: [
        "Open the payment checkout page",
        "Enter declined card details",
        "Submit the payment"
      ],
      expectedResult: "System shows a payment failure message and does not mark the order as paid.",
      priority: "High"
    },
    {
      scenario: "Verify required validation for payment details",
      steps: [
        "Open the payment checkout page",
        "Leave required card or billing fields empty",
        "Submit the payment"
      ],
      expectedResult: "System prevents payment submission and displays validation messages.",
      priority: "Medium"
    }
  ],
  generic: [
    {
      scenario: "Verify that the feature loads successfully",
      steps: [
        "Open the target feature page",
        "Review the initial page content",
        "Confirm all key controls are visible"
      ],
      expectedResult: "Feature page loads without errors and all expected controls are available.",
      priority: "High"
    },
    {
      scenario: "Verify valid user input is accepted",
      steps: [
        "Open the target feature page",
        "Enter valid data into all required fields",
        "Submit the form or complete the workflow"
      ],
      expectedResult: "System accepts the input and completes the workflow successfully.",
      priority: "High"
    },
    {
      scenario: "Verify validation for missing required input",
      steps: [
        "Open the target feature page",
        "Leave required fields empty",
        "Submit the form or continue the workflow"
      ],
      expectedResult: "System prevents submission and clearly identifies missing required inputs.",
      priority: "Medium"
    },
    {
      scenario: "Verify cancellation or navigation behavior",
      steps: [
        "Open the target feature page",
        "Start the workflow",
        "Cancel or navigate back before completion"
      ],
      expectedResult: "System exits the workflow without saving incomplete changes.",
      priority: "Low"
    }
  ]
};

const getRule = (featureDescription) => {
  const description = featureDescription.toLowerCase();

  if (description.includes("login")) return "login";
  if (description.includes("register")) return "register";
  if (description.includes("payment")) return "payment";

  return "generic";
};

const buildTestCases = ({ projectName, moduleName, featureDescription, count }) => {
  const rule = getRule(featureDescription);
  const selectedTemplates = templates[rule];

  return Array.from({ length: count }, (_, index) => {
    const template = selectedTemplates[index % selectedTemplates.length];
    const sequence = String(index + 1).padStart(3, "0");

    return {
      id: `TC-${Date.now()}-${sequence}`,
      testCaseId: `TC-${sequence}`,
      projectName,
      moduleName,
      featureDescription,
      testScenario: template.scenario,
      testSteps: template.steps,
      expectedResult: template.expectedResult,
      priority: template.priority,
      saved: false
    };
  });
};

const getUserCases = (userId) => savedTestCasesByUser.get(userId) || [];
const setUserCases = (userId, testCases) => savedTestCasesByUser.set(userId, testCases);

router.get("/", protect, (req, res) => {
  res.json({
    tests: getUserCases(req.user.id)
  });
});

router.post("/generate", protect, (req, res) => {
  const { projectName, moduleName, featureDescription, numberOfTestCases } = req.body;
  const count = Number(numberOfTestCases);

  if (!projectName || !moduleName || !featureDescription || !Number.isInteger(count)) {
    return res.status(400).json({ message: "Project, module, feature description, and test case count are required" });
  }

  if (count < 1 || count > 50) {
    return res.status(400).json({ message: "Number of test cases must be between 1 and 50" });
  }

  res.status(201).json({
    testCases: buildTestCases({
      projectName: projectName.trim(),
      moduleName: moduleName.trim(),
      featureDescription: featureDescription.trim(),
      count
    })
  });
});

router.post("/", protect, (req, res) => {
  const { testCase } = req.body;

  if (!testCase?.testCaseId || !testCase?.testScenario) {
    return res.status(400).json({ message: "A valid test case is required" });
  }

  const userCases = getUserCases(req.user.id);
  const existingIndex = userCases.findIndex((item) => item.id === testCase.id);
  const savedCase = { ...testCase, saved: true };

  if (existingIndex >= 0) {
    userCases[existingIndex] = savedCase;
  } else {
    userCases.push(savedCase);
  }

  setUserCases(req.user.id, userCases);
  res.status(201).json({ testCase: savedCase });
});

router.put("/:id", protect, (req, res) => {
  const userCases = getUserCases(req.user.id);
  const testCaseIndex = userCases.findIndex((testCase) => testCase.id === req.params.id);

  if (testCaseIndex === -1) {
    return res.status(404).json({ message: "Test case not found" });
  }

  userCases[testCaseIndex] = {
    ...userCases[testCaseIndex],
    ...req.body,
    id: userCases[testCaseIndex].id,
    saved: true
  };
  setUserCases(req.user.id, userCases);

  res.json({ testCase: userCases[testCaseIndex] });
});

router.delete("/:id", protect, (req, res) => {
  const userCases = getUserCases(req.user.id);
  const nextCases = userCases.filter((testCase) => testCase.id !== req.params.id);

  if (nextCases.length === userCases.length) {
    return res.status(404).json({ message: "Test case not found" });
  }

  setUserCases(req.user.id, nextCases);
  res.json({ message: "Test case deleted" });
});

export default router;
