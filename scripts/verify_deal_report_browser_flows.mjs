#!/usr/bin/env node
/**
 * BizExchange Real Browser Verification Suite for:
 *   1. Buyer submits LKR offer -> Seller accepts -> Both confirm completion -> Buyer submits review.
 *   2. Buyer reports business/seller -> Admin resolves -> Buyer sees public explanation but NOT internal notes.
 *   3. Deal cancelled after listing restricted -> Confirm cancellation preserves restriction.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const puppeteer = require("../Frontend/node_modules/puppeteer-core");
import fs from "fs";
import assert from "node:assert/strict";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bizexchange.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdminPass123!";

function findBrowserExecutable() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("No Chrome/Edge browser executable found.");
}

async function apiPost(url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${url}`, {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function apiPut(url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${url}`, {
    method: "PUT",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function apiGet(url, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${url}`, { method: "GET", headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function loginInBrowser(page, email, password) {
  // Always navigate to /login first to ensure valid web origin
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
  });
  await page.reload({ waitUntil: "networkidle2" });

  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 10000 });

  const emailInput = await page.$('input[name="email"], input[type="email"]');
  await emailInput.click({ clickCount: 3 });
  await emailInput.type(email);

  const passInput = await page.$('input[name="password"], input[type="password"]');
  await passInput.click({ clickCount: 3 });
  await passInput.type(password);

  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();

  // Wait for token in localStorage and redirect
  await page.waitForFunction(() => !!localStorage.getItem("token") && !!localStorage.getItem("role"), {
    timeout: 12000,
  });
  await page.waitForFunction(() => !window.location.pathname.endsWith("/login"), { timeout: 12000 });
  await new Promise((r) => setTimeout(r, 600));
}

async function createAndFullyApproveBusiness(title, category, askingPrice, sellerToken, adminToken) {
  const createRes = await apiPost(
    "/businesses",
    {
      title,
      category,
      description: "Automated browser verification test business listing.",
      location: "Colombo",
      askingPrice,
      businessAgeYears: 3,
      numberOfEmployees: 5,
    },
    sellerToken
  );
  assert.ok(createRes.ok, `Business creation failed: HTTP ${createRes.status}`);
  const busId = createRes.data.data.id;

  // Retrieve automatically submitted verification request
  const getVerif = await apiGet(`/verification/business/${busId}`, adminToken);
  assert.ok(getVerif.ok, `Failed to fetch verification request: HTTP ${getVerif.status}`);
  const reqId = getVerif.data.data.id;

  // Officer / Admin approves verification
  const approveVerif = await apiPost(`/verification/${reqId}/approve`, null, adminToken);
  assert.ok(approveVerif.ok, `Verification approval failed: HTTP ${approveVerif.status}`);

  // Admin approves business publication
  const approvePub = await apiPut(`/admin/businesses/${busId}/approve`, null, adminToken);
  assert.ok(approvePub.ok, `Business approval failed: HTTP ${approvePub.status}`);

  return busId;
}

async function run() {
  console.log("==================================================================");
  console.log("   BIZEXCHANGE REAL BROWSER WORKFLOW VERIFICATION SUITE           ");
  console.log("==================================================================");

  const browserPath = findBrowserExecutable();
  console.log(`[Config] Browser Executable: ${browserPath}`);
  console.log(`[Config] Frontend Target:    ${FRONTEND_URL}`);
  console.log(`[Config] Backend Target:     ${BACKEND_URL}`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const results = {
    flow1: "PENDING",
    flow2: "PENDING",
    flow3: "PENDING",
  };

  try {
    const ts = Date.now();

    // ─────────────────────────────────────────────────────────────────────────
    // 0. FIXTURE SETUP
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Setup] Provisioning disposable test accounts...");

    // Admin login
    const adminLogin = await apiPost("/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    assert.ok(adminLogin.ok, `Admin login failed: HTTP ${adminLogin.status}`);
    const adminToken = adminLogin.data.data.token;

    // Register Buyer 1
    const buyer1Email = `buyer_${ts}@bizexchange.local`;
    const buyer1Pass = `BuyerPass${ts}!`;
    const buyer1Reg = await apiPost("/auth/register/buyer", {
      fullName: "Browser Test Buyer",
      email: buyer1Email,
      password: buyer1Pass,
    });
    assert.ok(buyer1Reg.ok, `Buyer registration failed: HTTP ${buyer1Reg.status}`);
    const buyer1Mailbox = await apiGet(`/test/mailbox/latest-verification?email=${encodeURIComponent(buyer1Email)}`);
    await apiPost("/auth/verify-email", { token: buyer1Mailbox.data.data.token });
    const buyerLogin = await apiPost("/auth/login", { email: buyer1Email, password: buyer1Pass });
    const buyerToken = buyerLogin.data.data.token;
    console.log(`  ✓ Buyer provisioned & authenticated: ${buyer1Email}`);

    // Register Seller 1
    const seller1Email = `seller_${ts}@bizexchange.local`;
    const seller1Pass = `SellerPass${ts}!`;
    const seller1Reg = await apiPost("/auth/register/seller", {
      fullName: "Browser Test Seller",
      email: seller1Email,
      password: seller1Pass,
      phone: "0771234567",
      nicOrPassport: "199101010001",
      address: "100 High Street, Colombo 03",
      businessOwnerType: "Sole Proprietorship",
    });
    assert.ok(seller1Reg.ok, `Seller registration failed: HTTP ${seller1Reg.status}`);
    const seller1Mailbox = await apiGet(`/test/mailbox/latest-verification?email=${encodeURIComponent(seller1Email)}`);
    await apiPost("/auth/verify-email", { token: seller1Mailbox.data.data.token });

    // Approve seller profile via Admin
    const pendingSellers = await apiGet("/admin/sellers/pending", adminToken);
    const seller1Profile = pendingSellers.data?.data?.find((s) => s.email === seller1Email);
    assert.ok(seller1Profile, "Seller profile not found in pending queue");
    await apiPut(`/admin/sellers/${seller1Profile.id}/approve`, null, adminToken);

    const sellerLogin = await apiPost("/auth/login", { email: seller1Email, password: seller1Pass });
    const sellerToken = sellerLogin.data.data.token;
    console.log(`  ✓ Seller provisioned & approved: ${seller1Email}`);

    // Create Business 1 (for Flow 1)
    const bus1Id = await createAndFullyApproveBusiness(
      `LKR Bakery Express ${ts}`,
      "food",
      750000.0,
      sellerToken,
      adminToken
    );
    console.log(`  ✓ Business listing 1 #${bus1Id} created, verified, and published`);

    // Create Business 2 (for Flow 2)
    const bus2Id = await createAndFullyApproveBusiness(
      `Flow2 Audit Target ${ts}`,
      "retail",
      320000.0,
      sellerToken,
      adminToken
    );
    console.log(`  ✓ Business listing 2 #${bus2Id} created, verified, and published`);

    // ─────────────────────────────────────────────────────────────────────────
    // FLOW 1: Buyer submits LKR offer -> Seller accepts -> Both confirm completion -> Buyer submits review
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n==================================================================");
    console.log("FLOW 1: Buyer submits LKR offer -> Seller accepts -> Mutual completion -> Review");
    console.log("==================================================================");
    try {
      const page = await browser.newPage();
      page.on("dialog", async (dialog) => {
        console.log(`    [Browser Dialog] ${dialog.type()}: ${dialog.message()}`);
        await dialog.dismiss();
      });
      await page.setViewport({ width: 1400, height: 900 });

      // Step 1: Buyer logs in in browser
      console.log("  [Step 1.1] Buyer logging in via browser...");
      await loginInBrowser(page, buyer1Email, buyer1Pass);
      console.log("    ✓ Buyer authenticated in browser");

      // Step 2: Buyer navigates to business page
      console.log(`  [Step 1.2] Navigating to business page: ${FRONTEND_URL}/businesses/${bus1Id}...`);
      await page.goto(`${FRONTEND_URL}/businesses/${bus1Id}`, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 1000));

      // Look for Make Offer button ("Make an Acquisition Offer")
      await page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll("button")).some(
            (b) =>
              b.innerText &&
              (b.innerText.includes("Acquisition Offer") || b.innerText.includes("Make an Offer"))
          ),
        { timeout: 10000 }
      );

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find(
          (b) =>
            b.innerText &&
            (b.innerText.includes("Acquisition Offer") || b.innerText.includes("Make an Offer"))
        );
        btn?.click();
      });

      // Modal opens: fill offer amount and message
      console.log("  [Step 1.3] Submitting LKR 700,000 offer in modal...");
      await page.waitForSelector(".fixed.inset-0 input[type='number']", { timeout: 10000 });
      const amountInput = await page.$(".fixed.inset-0 input[type='number']");
      await amountInput.click({ clickCount: 3 });
      await amountInput.type("700000");

      const messageInput = await page.$(".fixed.inset-0 textarea");
      if (messageInput) {
        await messageInput.type("We are serious buyers and ready to close promptly.");
      }

      // Submit offer in modal
      await page.evaluate(() => {
        const modal = document.querySelector(".fixed.inset-0");
        if (!modal) throw new Error("Modal not found");
        const submitBtn = Array.from(modal.querySelectorAll("button")).find(
          (b) =>
            b.innerText &&
            (b.innerText.includes("Submit Formal Offer") ||
              b.innerText.includes("Submit Offer"))
        );
        if (!submitBtn) throw new Error("Submit Offer button not found in modal");
        submitBtn.click();
      });

      // Wait for success confirmation in modal
      await page.waitForFunction(
        () =>
          document.body.innerText.includes("Offer Submitted") ||
          document.body.innerText.includes("View Your Pending Offer"),
        { timeout: 10000 }
      );
      console.log("    ✓ Offer of 700,000 LKR submitted by buyer via browser");

      // Step 3: Seller logs in in browser and accepts offer
      console.log("  [Step 1.4] Seller logging in via browser...");
      await loginInBrowser(page, seller1Email, seller1Pass);

      console.log("  [Step 1.5] Seller opening /seller/offers to accept offer...");
      await page.goto(`${FRONTEND_URL}/seller/offers`, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 1500));
      await page.waitForFunction(
        (title) => document.body.innerText.toLowerCase().includes(title.toLowerCase()),
        { timeout: 15000 },
        `LKR Bakery Express ${ts}`
      );
      console.log("    ✓ Seller sees received offer in UI");

      // Click "Accept Offer & Open Deal"
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Accept Offer")
        );
        if (!btn) throw new Error("Accept Offer button not found");
        btn.click();
      });

      // Confirm in Accept modal
      await page.waitForSelector(".fixed.inset-0", { timeout: 10000 });
      await page.waitForFunction(
        () => document.querySelector(".fixed.inset-0")?.innerText?.includes("Accept Acquisition Offer"),
        { timeout: 10000 }
      );

      await page.evaluate(() => {
        const modal = document.querySelector(".fixed.inset-0");
        const btn = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Confirm & Accept Offer")
        );
        if (!btn) throw new Error("Confirm & Accept Offer button not found in modal");
        btn.click();
      });

      await page.waitForFunction(
        () =>
          document.body.innerText.includes("Manage Active Deal") ||
          document.body.innerText.includes("ACCEPTED"),
        { timeout: 15000 }
      );
      console.log("    ✓ Seller accepted offer; deal created");

      // Step 4: Seller navigates to /seller/deals and confirms completion
      console.log("  [Step 1.6] Seller confirming offline completion on /seller/deals...");
      await page.goto(`${FRONTEND_URL}/seller/deals`, { waitUntil: "networkidle2" });
      await page.waitForFunction(
        () => document.body.innerText.includes("Confirm Offline Completion"),
        { timeout: 15000 }
      );

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Confirm Offline Completion")
        );
        if (!btn) throw new Error("Confirm Offline Completion button not found on seller deals");
        btn.click();
      });

      // Confirm in modal
      await page.waitForSelector(".fixed.inset-0 button", { timeout: 10000 });
      await page.evaluate(() => {
        const modal = document.querySelector(".fixed.inset-0");
        const btn = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Yes, Confirm Completion")
        );
        if (!btn) throw new Error("Yes, Confirm Completion button not found in seller modal");
        btn.click();
      });

      await page.waitForFunction(
        () =>
          document.body.innerText.includes("Your Confirmation (Seller)") &&
          document.body.innerText.includes("Confirmed on"),
        { timeout: 15000 }
      );
      console.log("    ✓ Seller confirmed completion in UI");

      // Step 5: Buyer logs in, goes to /buyer/deals and confirms completion
      console.log("  [Step 1.7] Buyer logging in to confirm completion...");
      await loginInBrowser(page, buyer1Email, buyer1Pass);

      await page.goto(`${FRONTEND_URL}/buyer/deals`, { waitUntil: "networkidle2" });
      await page.waitForFunction(
        () => document.body.innerText.includes("Confirm Offline Completion"),
        { timeout: 15000 }
      );

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Confirm Offline Completion")
        );
        if (!btn) throw new Error("Confirm Offline Completion button not found on buyer deals");
        btn.click();
      });

      await page.waitForSelector(".fixed.inset-0 button", { timeout: 10000 });
      await page.evaluate(() => {
        const modal = document.querySelector(".fixed.inset-0");
        const btn = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Yes, Confirm Completion")
        );
        if (!btn) throw new Error("Yes, Confirm Completion button not found in buyer modal");
        btn.click();
      });

      // Status should become COMPLETED
      await page.waitForFunction(
        () =>
          document.body.innerText.includes("Completed") ||
          document.body.innerText.includes("Review Seller"),
        { timeout: 15000 }
      );
      console.log("    ✓ Both parties confirmed completion; Deal status transitioned to COMPLETED");

      // Step 6: Buyer submits review on completed deal
      console.log("  [Step 1.8] Buyer submitting verified review via UI...");
      await page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll("button")).some(
            (b) => b.innerText && b.innerText.includes("Review Seller")
          ),
        { timeout: 15000 }
      );

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Review Seller")
        );
        if (!btn) throw new Error("Review Seller button not found");
        btn.click();
      });

      // Fill review modal
      await page.waitForSelector(".fixed.inset-0 textarea", { timeout: 10000 });
      const commentInput = await page.$(".fixed.inset-0 textarea");
      await commentInput.type("Outstanding seller! The transition went smoothly and all assets were transferred as agreed.");

      // Submit review
      await page.evaluate(() => {
        const modal = document.querySelector(".fixed.inset-0");
        const btn = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Submit Verified Review")
        );
        if (!btn) throw new Error("Submit Verified Review button not found");
        btn.click();
      });

      await page.waitForFunction(
        () =>
          document.body.innerText.includes("Review Submitted") ||
          !document.querySelector(".fixed.inset-0"),
        { timeout: 15000 }
      );
      console.log("    ✓ Review submitted successfully in browser");

      results.flow1 = "PASS";
      await page.close();
    } catch (err) {
      console.error("  ✗ FLOW 1 ERROR:", err);
      results.flow1 = `FAIL: ${err.message}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLOW 2: Buyer reports business/seller -> Admin resolves -> Buyer sees public explanation but NOT internal notes
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n==================================================================");
    console.log("FLOW 2: Buyer reports listing -> Admin resolves -> Note visibility isolation");
    console.log("==================================================================");
    try {
      const page = await browser.newPage();
      page.on("dialog", async (dialog) => {
        console.log(`    [Browser Dialog] ${dialog.type()}: ${dialog.message()}`);
        await dialog.dismiss();
      });
      await page.setViewport({ width: 1400, height: 900 });

      // Step 2.1: Buyer logs in and reports business 2
      console.log("  [Step 2.1] Buyer logging in to report business...");
      await loginInBrowser(page, buyer1Email, buyer1Pass);

      console.log(`  [Step 2.2] Navigating to business #${bus2Id} to submit compliance report...`);
      await page.goto(`${FRONTEND_URL}/businesses/${bus2Id}`, { waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 1000));

      await page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll("button")).some(
            (b) => b.innerText && b.innerText.includes("Report Listing")
          ),
        { timeout: 10000 }
      );

      // Click "Report Listing" button
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Report Listing")
        );
        btn?.click();
      });

      // Fill Report modal
      await page.waitForSelector(".fixed textarea", { timeout: 5000 });
      const descInput = await page.$(".fixed textarea");
      await descInput.type(
        "The seller misstated revenue records in offline materials. Requesting platform audit."
      );

      // Submit report
      await page.evaluate(() => {
        const modal = document.querySelector(".fixed");
        const submitBtn = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Submit Report")
        );
        submitBtn?.click();
      });

      await page.waitForFunction(
        () =>
          document.body.innerText.includes("Report Submitted to Compliance") ||
          document.body.innerText.includes("Under Review") ||
          !document.querySelector(".fixed"),
        { timeout: 10000 }
      );
      console.log("    ✓ Report submitted by buyer via UI");

      // Step 2.2: Admin logs in and resolves report
      console.log("  [Step 2.3] Admin logging in to resolve report...");
      await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      console.log("  [Step 2.4] Navigating to /admin/reports...");
      await page.goto(`${FRONTEND_URL}/admin/reports`, { waitUntil: "networkidle2" });
      await page.waitForFunction(
        (title) =>
          document.body.innerText.includes(title) ||
          document.body.innerText.includes("SCAM_OR_FRAUD") ||
          document.body.innerText.includes("Scam or Fraud"),
        { timeout: 10000 },
        `Flow2 Audit Target ${ts}`
      );
      console.log("    ✓ Admin sees report in moderation queue");

      // Click "Inspect & Action" on the report table row
      await page.evaluate((targetTitle) => {
        const rows = Array.from(document.querySelectorAll("tr"));
        const targetRow = rows.find((r) => r.innerText && r.innerText.includes(targetTitle));
        const actionBtn = Array.from((targetRow || document).querySelectorAll("button")).find(
          (b) => b.innerText && (b.innerText.includes("Inspect & Action") || b.innerText.includes("Action"))
        );
        if (!actionBtn) throw new Error("Inspect & Action button not found");
        actionBtn.click();
      }, `Flow2 Audit Target ${ts}`);

      // Modal opens: click "✓ Resolve Report" button
      await page.waitForFunction(
        () => {
          const modal = document.querySelector(".fixed");
          if (!modal) return false;
          return Array.from(modal.querySelectorAll("button")).some(
            (b) => b.innerText && b.innerText.includes("Resolve Report")
          );
        },
        { timeout: 5000 }
      );

      await page.evaluate(() => {
        const modal = document.querySelector(".fixed");
        const resolveTrigger = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Resolve Report")
        );
        resolveTrigger?.click();
      });

      // Sub-form opens with 2 textareas: public resolution notes and confidential internal admin notes
      await page.waitForSelector(".fixed textarea", { timeout: 5000 });
      const publicExplanation = "Official platform audit concluded: seller records verified with tax filings.";
      const confidentialInternalNote = "CONFIDENTIAL_INTERNAL_NOTE_XYZ_987654: Auditor verified bank statements with Commercial Bank.";

      const textareas = await page.$$(".fixed textarea");
      assert.ok(textareas.length >= 2, "Expected at least 2 textareas (public explanation + admin internal notes)");
      await textareas[0].type(publicExplanation);
      await textareas[1].type(confidentialInternalNote);

      // Submit resolution ("Confirm RESOLVED")
      await page.evaluate(() => {
        const modal = document.querySelector(".fixed");
        const confirmBtn = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Confirm RESOLVED")
        );
        confirmBtn?.click();
      });

      await page.waitForFunction(
        () => document.body.innerText.includes("RESOLVED") || document.body.innerText.includes("Resolved"),
        { timeout: 10000 }
      );
      console.log("    ✓ Admin resolved report with public explanation AND internal admin notes");

      // Step 2.3: Buyer inspects /buyer/reports
      console.log("  [Step 2.5] Buyer checking /buyer/reports to verify note isolation...");
      await loginInBrowser(page, buyer1Email, buyer1Pass);

      await page.goto(`${FRONTEND_URL}/buyer/reports`, { waitUntil: "networkidle2" });
      await page.waitForFunction(
        (exp) =>
          document.body.innerText.includes(exp) ||
          document.body.innerText.includes("Admin Resolution Explanation"),
        { timeout: 15000 },
        publicExplanation
      );

      const pageText = await page.evaluate(() => document.body.innerText);

      // Verify public explanation IS present
      assert.ok(
        pageText.includes(publicExplanation),
        `Public explanation not visible in buyer UI: "${publicExplanation}"`
      );
      console.log("    ✓ Buyer correctly sees public resolution explanation: " + publicExplanation);

      // Verify internal note is NOT present
      assert.ok(
        !pageText.includes(confidentialInternalNote),
        `SECURITY LEAK: Buyer UI displays internal admin note: "${confidentialInternalNote}"`
      );
      console.log("    ✓ CONFIRMED: Internal admin note is NOT visible in Buyer UI (zero leak)");

      // Also verify API response strictly omits internal notes for buyer
      const buyerReportsRes = await apiGet("/reports/my", buyerToken);
      assert.ok(buyerReportsRes.ok, "Failed to get /reports/my");
      const buyerReportObj = buyerReportsRes.data.data[0];
      assert.strictEqual(buyerReportObj.resolutionNotes, publicExplanation);
      assert.strictEqual(buyerReportObj.adminInternalNotes, undefined, "API leaked adminInternalNotes to buyer");
      console.log("    ✓ CONFIRMED: API response model (ReportBuyerResponse) strictly omits internal notes");

      results.flow2 = "PASS";
      await page.close();
    } catch (err) {
      console.error("  ✗ FLOW 2 ERROR:", err);
      results.flow2 = `FAIL: ${err.message}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLOW 3: Cancel a deal after the listing has been restricted; confirm cancellation preserves the restriction
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n==================================================================");
    console.log("FLOW 3: Cancel deal on restricted listing -> Verify restriction preserved");
    console.log("==================================================================");
    try {
      const page = await browser.newPage();
      page.on("dialog", async (dialog) => {
        console.log(`    [Browser Dialog] ${dialog.type()}: ${dialog.message()}`);
        await dialog.dismiss();
      });
      await page.setViewport({ width: 1400, height: 900 });

      // Create new business for Flow 3
      const bus3Id = await createAndFullyApproveBusiness(
        `Flow3 Restricted Listing ${ts}`,
        "food",
        400000.0,
        sellerToken,
        adminToken
      );
      console.log(`  [Step 3.1] Created and approved Business #${bus3Id}`);

      // Buyer makes offer via API
      const offer3Res = await apiPost(
        "/offers",
        { businessId: bus3Id, amount: 390000.0, currency: "LKR", message: "Flow 3 offer" },
        buyerToken
      );
      assert.ok(offer3Res.ok, `Buyer offer 3 failed: ${JSON.stringify(offer3Res)}`);
      const offer3Id = offer3Res.data.data.id;

      // Seller accepts offer -> Deal created (IN_PROGRESS)
      const accept3Res = await apiPut(`/offers/${offer3Id}/accept`, null, sellerToken);
      assert.ok(accept3Res.ok, "Seller acceptance 3 failed");
      const deal3Id = accept3Res.data.data.dealId;
      console.log(`  [Step 3.2] Deal #${deal3Id} created in IN_PROGRESS state`);

      // Admin RESTRICTS the listing (setting status to REJECTED via query parameter)
      console.log(`  [Step 3.3] Admin restricting listing #${bus3Id} (setting status to REJECTED)...`);
      const rejectListingRes = await apiPut(
        `/admin/businesses/${bus3Id}/reject?reason=${encodeURIComponent("Compliance audit failure - business licenses expired.")}`,
        null,
        adminToken
      );
      assert.ok(rejectListingRes.ok, "Failed to reject business listing");

      // Verify business is REJECTED in database
      const busVerify1 = await apiGet(`/businesses/${bus3Id}`, adminToken);
      assert.ok(busVerify1.ok);
      assert.strictEqual(busVerify1.data.data.status, "REJECTED", "Business status should be REJECTED");
      console.log("    ✓ Business listing is confirmed restricted: status = REJECTED");

      // Now Admin cancels the deal in browser on /admin/deals
      console.log(`  [Step 3.4] Admin cancelling deal #${deal3Id} via browser on /admin/deals...`);
      await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await page.goto(`${FRONTEND_URL}/admin/deals`, { waitUntil: "networkidle2" });
      await page.waitForFunction(
        (id) =>
          document.body.innerText.includes(`Deal #${id}`) ||
          document.body.innerText.includes(`#${id}`),
        { timeout: 10000 },
        deal3Id
      );
      console.log("    ✓ Admin sees Deal in /admin/deals queue");

      // Click "Inspect / Manage" button for this deal
      await page.evaluate((dId) => {
        const rows = Array.from(document.querySelectorAll("tr"));
        const targetRow = rows.find((r) => r.innerText && r.innerText.includes(`#${dId}`));
        if (!targetRow) throw new Error("Deal row not found");
        const inspectBtn = Array.from(targetRow.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Inspect / Manage")
        );
        if (!inspectBtn) throw new Error("Inspect / Manage button not found on deal row");
        inspectBtn.click();
      }, deal3Id);

      // In modal: click "Administrative Cancellation (Enforce Stop)"
      await page.waitForFunction(
        () => {
          const modal = document.querySelector(".fixed");
          if (!modal) return false;
          return Array.from(modal.querySelectorAll("button")).some(
            (b) => b.innerText && b.innerText.includes("Administrative Cancellation")
          );
        },
        { timeout: 5000 }
      );

      await page.evaluate(() => {
        const modal = document.querySelector(".fixed");
        const cancelTrigger = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Administrative Cancellation")
        );
        cancelTrigger?.click();
      });

      // Enter required cancellation reason in modal
      await page.waitForSelector(".fixed textarea", { timeout: 5000 });
      const cancelReasonInput = await page.$(".fixed textarea");
      await cancelReasonInput.type(
        "Platform administrative action due to expired business licenses."
      );

      // Submit cancellation
      await page.evaluate(() => {
        const modal = document.querySelector(".fixed");
        const confirmBtn = Array.from(modal.querySelectorAll("button")).find(
          (b) => b.innerText && b.innerText.includes("Confirm Admin Cancel")
        );
        confirmBtn?.click();
      });

      // Wait specifically for success message banner on /admin/deals
      await page.waitForFunction(
        () => document.body.innerText.includes("successfully cancelled by administrator"),
        { timeout: 15000 }
      );
      console.log("    ✓ Deal cancelled by admin via UI");

      // Give 500ms for API response and DB commit
      await new Promise((r) => setTimeout(r, 500));

      // Step 3.5: Confirm Deal is CANCELLED and Business remains REJECTED (not restored to APPROVED)
      console.log("  [Step 3.5] Verifying database and API states after cancellation...");
      const dealVerify = await apiGet(`/deals/${deal3Id}`, adminToken);
      assert.strictEqual(dealVerify.data.data.status, "CANCELLED", "Deal must be CANCELLED");
      console.log("    ✓ Deal status: CANCELLED");

      const busVerify2 = await apiGet(`/businesses/${bus3Id}`, adminToken);
      assert.strictEqual(
        busVerify2.data.data.status,
        "REJECTED",
        "CRITICAL: Business listing status was erroneously altered away from REJECTED!"
      );
      assert.strictEqual(
        busVerify2.data.data.rejectionReason,
        "Compliance audit failure - business licenses expired."
      );
      console.log("    ✓ CONFIRMED: Business listing status remains REJECTED; administrative restriction preserved!");

      results.flow3 = "PASS";
      await page.close();
    } catch (err) {
      console.error("  ✗ FLOW 3 ERROR:", err);
      results.flow3 = `FAIL: ${err.message}`;
    }

  } finally {
    await browser.close();
  }

  console.log("\n==================================================================");
  console.log("              FINAL BROWSER VERIFICATION SUMMARY                   ");
  console.log("==================================================================");
  console.log(`Flow 1 (Offer -> Deal -> Completion -> Review):  ${results.flow1}`);
  console.log(`Flow 2 (Report -> Admin Resolve -> Visibility):  ${results.flow2}`);
  console.log(`Flow 3 (Restricted Listing Deal Cancellation):   ${results.flow3}`);
  console.log("==================================================================");

  if (results.flow1 !== "PASS" || results.flow2 !== "PASS" || results.flow3 !== "PASS") {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
