import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Project from "../models/Project.js";

const router = express.Router();
const savedTestCasesByUser = new Map();

const templates = {
  login: [
    {
      scenario: "Verify login succeeds with a registered email and valid password",
      steps: ["Open the login page", "Enter a registered email address", "Enter the matching valid password", "Click the login button", "Observe the post-login landing page"],
      expectedResult: "The user is authenticated, the session is created, and the dashboard or configured landing page is displayed.",
      priority: "High"
    },
    {
      scenario: "Verify login fails with an incorrect password",
      steps: ["Open the login page", "Enter a registered email address", "Enter an incorrect password", "Click the login button", "Review the inline or toast error message"],
      expectedResult: "The system rejects the login attempt, keeps the user on the login page, and shows a clear invalid credentials message.",
      priority: "High"
    },
    {
      scenario: "Verify required validation when login fields are empty",
      steps: ["Open the login page", "Leave email and password blank", "Click the login button", "Check validation near each required field"],
      expectedResult: "The form is not submitted and required field validation is shown for email and password.",
      priority: "Medium"
    },
    {
      scenario: "Verify email format validation on login",
      steps: ["Open the login page", "Enter an invalid email format", "Enter any password", "Click the login button", "Check the email field validation state"],
      expectedResult: "The system blocks submission and asks the user to enter a valid email address.",
      priority: "Medium"
    },
    {
      scenario: "Verify locked or inactive account login handling",
      steps: ["Open the login page", "Enter credentials for a locked or inactive account", "Click the login button", "Review the account status message"],
      expectedResult: "The system prevents access and displays an account status message without exposing sensitive account details.",
      priority: "High"
    }
  ],
  register: [
    {
      scenario: "Verify registration succeeds with valid user details",
      steps: ["Open the registration page", "Enter a full name", "Enter a unique valid email address", "Enter a valid password and matching confirm password", "Submit the registration form"],
      expectedResult: "The account is created successfully and the user sees a success message or is signed in.",
      priority: "High"
    },
    {
      scenario: "Verify duplicate email validation during registration",
      steps: ["Open the registration page", "Enter a valid full name", "Enter an email address that already exists", "Enter a valid password and matching confirm password", "Submit the registration form"],
      expectedResult: "The system rejects the registration and clearly indicates that the email is already registered.",
      priority: "High"
    },
    {
      scenario: "Verify password confirmation mismatch validation",
      steps: ["Open the registration page", "Enter valid name and email details", "Enter a password", "Enter a different confirm password", "Submit the registration form"],
      expectedResult: "The account is not created and the confirm password field shows a mismatch validation message.",
      priority: "Medium"
    },
    {
      scenario: "Verify required validation on the registration form",
      steps: ["Open the registration page", "Leave name, email, password, or confirm password blank", "Submit the registration form", "Review field-level validation messages"],
      expectedResult: "The system blocks account creation and highlights every missing required field.",
      priority: "Medium"
    },
    {
      scenario: "Verify minimum password strength rules during registration",
      steps: ["Open the registration page", "Enter valid name and email details", "Enter a password below the required strength or length", "Submit the registration form"],
      expectedResult: "The system rejects the weak password and explains the password requirement that was not met.",
      priority: "Medium"
    }
  ],
  payment: [
    {
      scenario: "Verify payment succeeds with valid receiver and amount details",
      steps: ["Open the payment page", "Enter valid receiver account or card details", "Enter a valid payable amount", "Add a payment note if the field is available", "Confirm the payment"],
      expectedResult: "The payment is submitted successfully and a confirmation message with a transaction reference is displayed.",
      priority: "High"
    },
    {
      scenario: "Verify OTP-protected payment confirmation",
      steps: ["Open the payment page", "Enter receiver account or card details", "Enter a valid amount", "Request the OTP", "Enter the received OTP", "Confirm the payment", "Open transaction history"],
      expectedResult: "The system validates the OTP, completes the payment, and records the transaction in history.",
      priority: "High"
    },
    {
      scenario: "Verify payment validation for missing receiver details",
      steps: ["Open the payment page", "Leave receiver account or card details blank", "Enter a valid amount", "Attempt to confirm the payment", "Check receiver field validation"],
      expectedResult: "The payment is not submitted and the receiver details field displays a required validation message.",
      priority: "High"
    },
    {
      scenario: "Verify payment amount boundary validation",
      steps: ["Open the payment page", "Enter valid receiver details", "Enter zero, negative, or above-limit amount", "Attempt to confirm the payment", "Review amount validation"],
      expectedResult: "The system blocks the payment and explains the allowed amount range.",
      priority: "High"
    },
    {
      scenario: "Verify declined payment handling",
      steps: ["Open the payment page", "Enter receiver details linked to a declined or insufficient-funds scenario", "Enter a valid amount", "Confirm the payment", "Review the failure response"],
      expectedResult: "The system shows a failure message, does not debit the account, and does not create a successful transaction record.",
      priority: "High"
    },
    {
      scenario: "Verify cancelled payment does not create a transaction",
      steps: ["Open the payment page", "Enter receiver details and amount", "Proceed to the confirmation step", "Cancel the payment before final confirmation", "Check transaction history"],
      expectedResult: "The payment is cancelled, no transaction is completed, and transaction history remains unchanged.",
      priority: "Medium"
    }
  ],
  profile: [
    {
      scenario: "Verify profile details can be updated successfully",
      steps: ["Open the profile page", "Edit one or more allowed profile fields", "Save the changes", "Refresh or reopen the profile page"],
      expectedResult: "The updated profile details are saved and remain visible after refresh.",
      priority: "High"
    },
    {
      scenario: "Verify profile image upload during profile update",
      steps: ["Open the profile page", "Select a valid profile image file", "Upload the image", "Save profile changes", "Check the displayed profile avatar"],
      expectedResult: "The image is uploaded successfully and the new avatar is displayed in the profile.",
      priority: "Medium"
    },
    {
      scenario: "Verify profile validation for invalid field values",
      steps: ["Open the profile page", "Enter invalid values such as malformed phone or email data", "Save the changes", "Review validation messages"],
      expectedResult: "The system blocks the update and highlights each invalid profile field.",
      priority: "Medium"
    },
    {
      scenario: "Verify cancelling profile edits preserves existing data",
      steps: ["Open the profile page", "Change one or more fields", "Click cancel or navigate away without saving", "Reopen the profile page"],
      expectedResult: "Unsaved changes are discarded and the original profile data is preserved.",
      priority: "Low"
    }
  ],
  cart: [
    {
      scenario: "Verify a product can be added to the shopping cart",
      steps: ["Open the product listing or product details page", "Select a product", "Click Add to Cart", "Open the shopping cart"],
      expectedResult: "The selected product appears in the cart with the correct name, price, and default quantity.",
      priority: "High"
    },
    {
      scenario: "Verify cart quantity update recalculates totals",
      steps: ["Open the shopping cart", "Increase or decrease product quantity", "Apply the quantity change", "Review subtotal and total amounts"],
      expectedResult: "The cart updates the item quantity and recalculates all totals accurately.",
      priority: "High"
    },
    {
      scenario: "Verify coupon application in the cart",
      steps: ["Open the shopping cart", "Enter a valid coupon code", "Apply the coupon", "Review discount and final total"],
      expectedResult: "The coupon discount is applied and the final total reflects the correct reduced amount.",
      priority: "Medium"
    },
    {
      scenario: "Verify invalid coupon handling in the cart",
      steps: ["Open the shopping cart", "Enter an invalid or expired coupon code", "Apply the coupon", "Review the coupon validation message"],
      expectedResult: "The system rejects the coupon and keeps the cart total unchanged.",
      priority: "Medium"
    },
    {
      scenario: "Verify a product can be removed from the cart",
      steps: ["Open the shopping cart with at least one product", "Click Remove for a selected cart item", "Confirm the removal if prompted", "Review the updated cart contents"],
      expectedResult: "The selected product is removed from the cart and cart totals are recalculated without that item.",
      priority: "High"
    },
    {
      scenario: "Verify out-of-stock product cannot be added to the cart",
      steps: ["Open a product details page for an out-of-stock item", "Review the stock status", "Attempt to add the item to the cart", "Check the cart contents"],
      expectedResult: "The system blocks the add-to-cart action and shows an out-of-stock message without adding the item.",
      priority: "High"
    },
    {
      scenario: "Verify checkout is blocked when the cart is empty",
      steps: ["Open the shopping cart with no products added", "Click Proceed to Checkout if the action is visible", "Review the empty cart state and checkout controls"],
      expectedResult: "The system prevents checkout and instructs the user to add products before continuing.",
      priority: "High"
    },
    {
      scenario: "Verify cart total calculation for multiple products",
      steps: ["Add two or more products with different prices to the cart", "Set different quantities for each product", "Review subtotal, discounts, taxes, and final total", "Compare totals with expected manual calculation"],
      expectedResult: "The cart calculates item subtotals and final total accurately for all products and quantities.",
      priority: "High"
    },
    {
      scenario: "Verify checkout can be started from the cart",
      steps: ["Open the shopping cart with at least one product", "Verify item totals", "Click Proceed to Checkout", "Review the checkout page"],
      expectedResult: "The user is taken to checkout with the selected cart items and totals carried forward.",
      priority: "High"
    },
    {
      scenario: "Verify saved cart persists after page refresh",
      steps: ["Add one or more products to the shopping cart", "Refresh the page or sign out and sign back in", "Open the shopping cart", "Review persisted cart items and quantities"],
      expectedResult: "The cart retains previously added products and quantities after refresh or session restore.",
      priority: "Medium"
    }
  ],
  generic: [
    {
      scenario: "Verify the feature page loads and displays primary controls",
      steps: ["Open the feature page", "Review the initial page content", "Confirm primary controls and required labels are visible", "Check that no error state is shown"],
      expectedResult: "The feature loads successfully with all primary controls visible and no unexpected errors.",
      priority: "High"
    },
    {
      scenario: "Verify the main successful workflow for the feature",
      steps: ["Open the feature page", "Enter valid data for required fields", "Complete the primary action", "Review the success state or resulting record"],
      expectedResult: "The system completes the workflow and shows a clear success state with the expected data.",
      priority: "High"
    },
    {
      scenario: "Verify validation for missing required information",
      steps: ["Open the feature page", "Leave required fields empty", "Attempt to continue or submit", "Review validation messages"],
      expectedResult: "The system blocks the action and identifies each missing required input.",
      priority: "Medium"
    },
    {
      scenario: "Verify invalid data is rejected by the feature",
      steps: ["Open the feature page", "Enter invalid or unsupported values", "Submit the workflow", "Review field-level and page-level errors"],
      expectedResult: "The system rejects invalid data without saving changes and shows actionable error messages.",
      priority: "Medium"
    },
    {
      scenario: "Verify boundary values are handled correctly",
      steps: ["Open the feature page", "Enter minimum allowed values", "Submit and record the result", "Repeat with maximum allowed values", "Repeat with values outside the allowed range"],
      expectedResult: "Allowed boundary values are accepted and out-of-range values are rejected with clear validation.",
      priority: "Medium"
    },
    {
      scenario: "Verify cancelling the workflow does not save partial changes",
      steps: ["Open the feature page", "Start the workflow and enter partial data", "Cancel or navigate back before submitting", "Return to the feature and review saved data"],
      expectedResult: "Partial changes are discarded and no incomplete data is saved.",
      priority: "Low"
    }
  ]
};

const getRule = (featureDescription) => {
  const description = featureDescription.toLowerCase();

  if (description.includes("login") || description.includes("sign in") || description.includes("signin")) return "login";
  if (description.includes("register") || description.includes("registration") || description.includes("sign up") || description.includes("signup")) return "register";
  if (description.includes("payment") || description.includes("transfer") || description.includes("card") || description.includes("transaction")) return "payment";
  if (description.includes("profile") || description.includes("account settings") || description.includes("avatar")) return "profile";
  if (description.includes("cart") || description.includes("checkout") || description.includes("coupon") || description.includes("shopping")) return "cart";

  return "generic";
};

const getTemplatesForFeature = (rule, featureDescription) => {
  const description = featureDescription.toLowerCase();

  if (rule !== "payment") {
    return templates[rule];
  }

  const mentionsOtp = description.includes("otp") || description.includes("one-time") || description.includes("one time");
  return templates.payment.filter((template) => mentionsOtp || !template.scenario.toLowerCase().includes("otp"));
};

const buildAdditionalTemplate = (rule, featureDescription, extraIndex) => {
  const feature = featureDescription.replace(/\s+/g, " ").trim() || "the feature";
  const additions = [
    {
      scenario: `Verify boundary input handling for ${feature}`,
      steps: ["Open the feature page", "Enter minimum allowed values", "Submit and observe the result", "Repeat with maximum allowed values", "Repeat with values outside the allowed range"],
      expectedResult: "Boundary values inside the allowed range are accepted and out-of-range values are rejected with clear validation.",
      priority: "Medium"
    },
    {
      scenario: `Verify unauthorized access is blocked for ${feature}`,
      steps: ["Sign out or use a user without permission", "Open the feature URL or action", "Attempt to complete the workflow", "Review the access control response"],
      expectedResult: "The system blocks unauthorized access and does not expose or modify protected data.",
      priority: "High"
    },
    {
      scenario: `Verify data persists after completing ${feature}`,
      steps: ["Open the feature page", "Complete the workflow with valid data", "Refresh the page or reopen the record", "Compare displayed data with submitted data"],
      expectedResult: "Saved data remains accurate after refresh and can be retrieved consistently.",
      priority: "Medium"
    },
    {
      scenario: `Verify duplicate submission handling for ${feature}`,
      steps: ["Open the feature page", "Enter valid workflow data", "Click the submit or confirm action twice quickly", "Review created records or confirmation messages"],
      expectedResult: "The system processes the action once and prevents duplicate records or duplicate transactions.",
      priority: "High"
    },
    {
      scenario: `Verify keyboard accessibility for ${feature}`,
      steps: ["Open the feature page", "Navigate through controls using the keyboard", "Complete the primary workflow without using a mouse", "Review focus order and final result"],
      expectedResult: "The feature can be operated with the keyboard and focus remains visible and logical throughout the workflow.",
      priority: "Low"
    },
    {
      scenario: `Verify recovery after a network interruption during ${feature}`,
      steps: ["Open the feature page", "Enter valid workflow data", "Simulate a network interruption before submission completes", "Restore connectivity and retry the action"],
      expectedResult: "The system handles the interruption gracefully and allows the user to retry without data loss or duplication.",
      priority: "Medium"
    }
  ];

  if (rule === "cart") {
    additions.unshift(
      {
        scenario: "Verify cart rejects quantity above available stock",
        steps: ["Open the shopping cart with an in-stock product", "Set the quantity above available stock", "Apply the quantity update", "Review quantity validation and cart total"],
        expectedResult: "The system rejects the excessive quantity and keeps the cart total based on a valid quantity.",
        priority: "High"
      },
      {
        scenario: "Verify cart handles price changes before checkout",
        steps: ["Add a product to the shopping cart", "Simulate or load an updated product price", "Proceed toward checkout", "Review the price update message and total"],
        expectedResult: "The cart alerts the user to the price change and recalculates the total before checkout continues.",
        priority: "Medium"
      }
    );
  }

  return additions[extraIndex % additions.length];
};

const getUniqueTemplates = (rule, featureDescription, count) => {
  const selectedTemplates = [...getTemplatesForFeature(rule, featureDescription)];
  const seen = new Set(selectedTemplates.map((template) => template.scenario.toLowerCase()));
  let extraIndex = 0;

  while (selectedTemplates.length < count) {
    const candidate = buildAdditionalTemplate(rule, featureDescription, extraIndex);
    extraIndex += 1;

    if (seen.has(candidate.scenario.toLowerCase())) {
      continue;
    }

    seen.add(candidate.scenario.toLowerCase());
    selectedTemplates.push(candidate);
  }

  return selectedTemplates.slice(0, count);
};

const buildTestCases = ({ projectId, projectName, moduleName, featureDescription, count }) => {
  const rule = getRule(featureDescription);
  const selectedTemplates = getUniqueTemplates(rule, featureDescription, count);

  return Array.from({ length: count }, (_, index) => {
    const template = selectedTemplates[index];
    const sequence = String(index + 1).padStart(3, "0");

    return {
      id: `TC-${Date.now()}-${sequence}`,
      testCaseId: `TC-${sequence}`,
      projectId,
      projectName,
      moduleName,
      featureDescription,
      testScenario: template.scenario,
      testSteps: template.steps,
      expectedResult: template.expectedResult,
      priority: template.priority,
      status: "Not Run",
      saved: false
    };
  });
};

const getUserCases = (userId) => savedTestCasesByUser.get(userId) || [];
const setUserCases = (userId, testCases) => savedTestCasesByUser.set(userId, testCases);

export const detachProjectFromSavedTestCases = (userId, projectId, fallbackProjectName) => {
  const userCases = getUserCases(String(userId));
  let changed = false;

  const nextCases = userCases.map((testCase) => {
    if (String(testCase.projectId || "") !== String(projectId)) {
      return testCase;
    }

    changed = true;
    return {
      ...testCase,
      projectId: "",
      projectName: fallbackProjectName ? `${fallbackProjectName} (deleted)` : "Deleted project"
    };
  });

  if (changed) {
    setUserCases(String(userId), nextCases);
  }

  return changed;
};

router.get("/", protect, (req, res) => {
  res.json({
    tests: getUserCases(req.user.id)
  });
});

router.delete("/", protect, (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Test case ids are required" });
  }

  const idSet = new Set(ids.map(String));
  const userCases = getUserCases(req.user.id);
  const nextCases = userCases.filter((testCase) => !idSet.has(String(testCase.id)));
  const deletedCount = userCases.length - nextCases.length;

  setUserCases(req.user.id, nextCases);

  res.json({
    deletedCount,
    tests: nextCases
  });
});

router.post("/generate", protect, async (req, res) => {
  const { projectId, projectName, moduleName, featureDescription, numberOfTestCases } = req.body;
  const count = Number(numberOfTestCases);

  if ((!projectId && !projectName) || !moduleName || !featureDescription || !Number.isInteger(count)) {
    return res.status(400).json({ message: "Project, module, feature description, and test case count are required" });
  }

  if (count < 1 || count > 50) {
    return res.status(400).json({ message: "Number of test cases must be between 1 and 50" });
  }

  try {
    let selectedProjectName = projectName?.trim();

    if (projectId) {
      const project = await Project.findOne({ _id: projectId, user: req.user._id });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      selectedProjectName = project.name;
    }

    res.status(201).json({
      testCases: buildTestCases({
        projectId: projectId || "",
        projectName: selectedProjectName,
        moduleName: moduleName.trim(),
        featureDescription: featureDescription.trim(),
        count
      })
    });
  } catch (error) {
    console.error("Generate test cases failed:", error);
    res.status(500).json({ message: "Could not generate test cases" });
  }
});

router.post("/", protect, async (req, res) => {
  const { testCase } = req.body;

  if (!testCase?.testCaseId || !testCase?.testScenario) {
    return res.status(400).json({ message: "A valid test case is required" });
  }

  try {
    if (testCase.projectId) {
      const project = await Project.findOne({ _id: testCase.projectId, user: req.user._id });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      testCase.projectName = project.name;
    }
  } catch (error) {
    console.error("Validate test case project failed:", error);
    return res.status(500).json({ message: "Could not validate project" });
  }

  const userCases = getUserCases(req.user.id);
  const existingIndex = userCases.findIndex((item) => item.id === testCase.id);
  const now = new Date().toISOString();
  const savedCase = {
    ...testCase,
    status: testCase.status || userCases[existingIndex]?.status || "Not Run",
    createdAt: testCase.createdAt || userCases[existingIndex]?.createdAt || now,
    updatedAt: now,
    saved: true
  };

  if (existingIndex >= 0) {
    userCases[existingIndex] = savedCase;
  } else {
    userCases.push(savedCase);
  }

  setUserCases(req.user.id, userCases);
  res.status(201).json({ testCase: savedCase });
});

router.put("/:id", protect, async (req, res) => {
  const userCases = getUserCases(req.user.id);
  const testCaseIndex = userCases.findIndex((testCase) => testCase.id === req.params.id);

  if (testCaseIndex === -1) {
    return res.status(404).json({ message: "Test case not found" });
  }

  const updates = { ...req.body };

  try {
    if (updates.projectId) {
      const project = await Project.findOne({ _id: updates.projectId, user: req.user._id });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      updates.projectName = project.name;
    }
  } catch (error) {
    console.error("Validate test case project failed:", error);
    return res.status(500).json({ message: "Could not validate project" });
  }

  userCases[testCaseIndex] = {
    ...userCases[testCaseIndex],
    ...updates,
    id: userCases[testCaseIndex].id,
    status: updates.status || userCases[testCaseIndex].status || "Not Run",
    createdAt: userCases[testCaseIndex].createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
