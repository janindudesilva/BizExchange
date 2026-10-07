#!/usr/bin/env node
/**
 * BizExchange Real Browser End-to-End Verification Suite
 *
 * Implements 5 real browser flows with strict assertions:
 *   Flow A: Upload failure and retry (simulates upload failure, asserts error UI and retry control, confirms retry reuses listing ID without duplication)
 *   Flow B: Persisted edits (modifies address, business age, employees, reason for selling, verifies persistence after reload, verifies optional-field clearing persists)
 *   Flow C: Officer document access (logs in as officer, opens private document through UI, asserts 200 OK + expected bytes, asserts unauthorized rejection)
 *   Flow D: Admin publication (verifies unapproved listing is hidden from anonymous visitor, approves publication via Admin UI, verifies listing becomes visible in anonymous context)
 *   Flow E: Email verification (verifies unverified account access is denied, verifies via isolated test mailbox token, verifies token reuse is rejected, verifies protected access succeeds)
 *
 * Dependencies:
 *   - Uses puppeteer-core (declared in package.json)
 *
 * Environment variables:
 *   - FRONTEND_URL: default http://localhost:3000
 *   - BACKEND_URL: default http://localhost:8080/api
 *   - ADMIN_EMAIL: default admin@bizexchange.local
 *   - ADMIN_PASSWORD: default AdminPass123!
 *   - CHROME_PATH: optional path to Chrome/Chromium/Edge executable
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const puppeteer = require("../Frontend/node_modules/puppeteer-core");
import fs from "fs";
import path from "path";
import os from "os";
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
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("No Chrome/Edge browser executable found. Set CHROME_PATH environment variable.");
}

async function apiPost(url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
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

async function run() {
  console.log("===============================================================");
  console.log("     BIZEXCHANGE REAL BROWSER ASSERTION SUITE                 ");
  console.log("===============================================================");

  const browserPath = findBrowserExecutable();
  console.log(`[Config] Browser Executable: ${browserPath}`);
  console.log(`[Config] Frontend Target:    ${FRONTEND_URL}`);
  console.log(`[Config] Backend Target:     ${BACKEND_URL}`);

  // ── 0. FIXTURE SETUP ────────────────────────────────────────────────────────
  console.log("\n[Setup] Provisioning isolated test fixtures...");
  const ts = Date.now();

  // Admin login to bootstrap officer
  const adminLogin = await apiPost("/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  assert.ok(adminLogin.ok, `Admin login failed: HTTP ${adminLogin.status}`);
  const adminToken = adminLogin.data.data.token;

  // Create isolated officer fixture
  const officerEmail = `officer_browser_${ts}@bizexchange.local`;
  const officerPass = `OffPass${ts}!`;
  const officerCreate = await apiPost(
    "/admin/staff",
    { fullName: "Browser Test Officer", email: officerEmail, password: officerPass, role: "VERIFICATION_OFFICER" },
    adminToken
  );
  assert.ok(officerCreate.ok, `Officer creation failed: HTTP ${officerCreate.status}`);
  console.log(`  ✓ Officer provisioned: ${officerEmail}`);

  // Create isolated verified seller fixture
  const sellerEmail = `seller_browser_${ts}@bizexchange.local`;
  const sellerPass = `SellerPass${ts}!`;
  const sellerRegister = await apiPost("/auth/register/seller", {
    fullName: "Browser Verified Seller",
    email: sellerEmail,
    password: sellerPass,
    phone: "0771234567",
    nicOrPassport: "199101010001",
    address: "100 High Street, Colombo 03",
    businessOwnerType: "Sole Proprietorship",
  });
  assert.ok(sellerRegister.ok, `Seller registration failed: HTTP ${sellerRegister.status}`);
  const sellerUserId = sellerRegister.data.data.userId;

  // Verify seller email via test mailbox
  const sellerMailbox = await apiGet(`/test/mailbox/latest-verification?email=${encodeURIComponent(sellerEmail)}`);
  assert.ok(sellerMailbox.ok, "Failed to get seller verification token");
  await apiPost("/auth/verify-email", { token: sellerMailbox.data.data.token });

  const sellerLogin = await apiPost("/auth/login", { email: sellerEmail, password: sellerPass });
  assert.ok(sellerLogin.ok, "Seller login failed in fixture setup");
  const sellerToken = sellerLogin.data.data.token;

  // Officer approves seller profile
  const officerLogin = await apiPost("/auth/login", { email: officerEmail, password: officerPass });
  const officerToken = officerLogin.data.data.token;
  const pendingSellers = await apiGet("/admin/sellers/pending", officerToken);
  const sellerProfile = pendingSellers.data?.data?.find((s) => s.userId === sellerUserId || s.email === sellerEmail);
  assert.ok(sellerProfile, "Seller profile not found in pending queue");
  await apiPut(`/admin/sellers/${sellerProfile.id}/approve`, null, officerToken);
  console.log(`  ✓ Verified seller provisioned: ${sellerEmail}`);

  function generateValidPdf(text) {
    const stream = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
    const streamLen = Buffer.byteLength(stream, "utf8");
    return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${stream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000330 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
407
%%EOF
`;
  }

  // Create sample valid PDF file for upload tests
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "biz_browser_test_"));
  const samplePdfPath = path.join(tempDir, "audit_sample.pdf");
  const samplePdfContent = generateValidPdf(`sample audit document content timestamp=${ts}`);
  fs.writeFileSync(samplePdfPath, samplePdfContent, "utf-8");

  // Launch browser
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    let createdBusinessId = null;
    let docFile = null;

    // Handle any browser confirmation / alert dialogs automatically
    await page.evaluateOnNewDocument(() => {
      window.confirm = () => true;
      window.alert = () => {};
    });
    page.on("dialog", async (dialog) => {
      try { await dialog.accept(); } catch {}
    });

    // ──────────────────────────────────────────────────────────────────────────
    // FLOW E: EMAIL VERIFICATION IN BROWSER
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n[FLOW E] Testing Email Verification Browser Flow...");
    const unverifiedEmail = `unverified_${ts}@bizexchange.local`;
    const unverifiedPass = `Unverified${ts}!`;

    // 1. Register unverified buyer
    const regRes = await apiPost("/auth/register/buyer", {
      fullName: "Unverified Buyer",
      email: unverifiedEmail,
      password: unverifiedPass,
      phone: "0712345678",
      preferredLocation: "Colombo",
      preferredBusinessCategory: "Technology",
      budgetMin: 10000,
      budgetMax: 50000,
    });
    assert.ok(regRes.ok, "Unverified buyer registration failed");

    // 2. Attempt login before email verification -> must be denied with clear message
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', unverifiedEmail);
    await page.type('input[type="password"]', unverifiedPass);
    await page.click('button[type="submit"]');

    // Wait for error message on login page
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes("please verify your email") || text.includes("disabled") || text.includes("check your inbox");
      },
      { timeout: 8000 }
    );
    assert.ok(page.url().includes("/login"), "Unverified account must remain on login page");
    console.log("  ✓ Browser login correctly rejected for unverified account with user feedback.");

    // 3. Test invalid verification token in browser
    await page.goto(`${FRONTEND_URL}/verify-email?token=invalid_dummy_token_${ts}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes("verification failed") || text.includes("token expired");
      },
      { timeout: 8000 }
    );
    console.log("  ✓ Invalid verification token rejected with error screen.");

    // 4. Retrieve real verification token from Test Mailbox
    const unverifiedMailbox = await apiGet(`/test/mailbox/latest-verification?email=${encodeURIComponent(unverifiedEmail)}`);
    assert.ok(unverifiedMailbox.ok, "Failed to retrieve verification token from test mailbox");
    const realToken = unverifiedMailbox.data.data.token;
    assert.ok(realToken, "Real token must exist in test mailbox");

    // 5. Navigate to verification URL with real token
    await page.goto(`${FRONTEND_URL}/verify-email?token=${encodeURIComponent(realToken)}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes("email verified!") || text.includes("continue to sign in");
      },
      { timeout: 12000 }
    );
    console.log("  ✓ Real email verification succeeded via browser.");

    // 6. Test token reuse in browser -> navigate to verification with distinct query to re-mount
    await page.goto(`${FRONTEND_URL}/verify-email?token=${encodeURIComponent(realToken)}&attempt=2`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes("verification failed") || text.includes("already verified");
      },
      { timeout: 12000 }
    );
    console.log("  ✓ Verification token reuse rejected on browser re-visit.");

    // 7. Login now succeeds
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', unverifiedEmail);
    await page.type('input[type="password"]', unverifiedPass);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 10000 });
    console.log(`  ✓ Login succeeded after verification. Landed at: ${page.url()}`);

    // Clear session for Flow A
    await page.evaluate(() => localStorage.clear());
    await page.deleteCookie(...(await page.cookies()));

    // ──────────────────────────────────────────────────────────────────────────
    // FLOW A: UPLOAD FAILURE AND RETRY
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n[FLOW A] Testing Listing Creation, Upload Failure & Retry Control...");

    // Sign in as the verified seller
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[type="email"]');
    await new Promise((r) => setTimeout(r, 600));
    await page.type('input[type="email"]', sellerEmail);
    await page.type('input[type="password"]', sellerPass);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 10000 });

    // Navigate to Create Listing page
    await page.goto(`${FRONTEND_URL}/seller/businesses/create`, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[name="title"]');

    const listingTitle = `Apex Logistics Hub ${ts}`;
    await page.type('input[name="title"]', listingTitle);
    await page.type('textarea[name="description"]', "Nationwide distribution and warehousing operation with stable fleet.");
    await page.type('input[name="location"]', "Colombo");
    await page.type('input[name="address"]', "12 Warehouse Road, Colombo 10");
    await page.type('input[name="askingPrice"]', "450000");
    await page.type('input[name="businessAgeYears"]', "6");
    await page.type('input[name="numberOfEmployees"]', "25");
    await page.type('textarea[name="reasonForSelling"]', "Partnership dissolution");

    // Select category
    const catOptions = await page.$$('select[name="category"] option:not([value=""])');
    if (catOptions.length > 0) {
      const val = await page.evaluate((el) => el.value, catOptions[0]);
      await page.select('select[name="category"]', val);
    }

    // Attach PDF document
    const fileInputs = await page.$$('input[type="file"]');
    assert.ok(fileInputs.length >= 2, "Expected at least 2 file input fields (photos and documents)");
    // fileInputs[1] is the documents drop zone
    await fileInputs[1].uploadFile(samplePdfPath);
    await page.waitForFunction(
      () => document.body.innerText.includes("audit_sample.pdf"),
      { timeout: 5000 }
    );
    console.log("  ✓ File attached to create form: audit_sample.pdf");

    // Enable request interception to force upload request to fail ONCE
    await page.setRequestInterception(true);
    let uploadInterceptionTriggered = false;

    const requestHandler = async (req) => {
      const url = req.url();
      if (url.includes("/files") && req.method() === "POST" && !uploadInterceptionTriggered) {
        uploadInterceptionTriggered = true;
        console.log("  -> [Interception] Forcing initial file upload failure (HTTP 500)...");
        req.respond({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Simulated network upload failure" }),
        });
      } else {
        req.continue();
      }
    };
    page.on("request", requestHandler);

    // Submit form
    await page.click('button[type="submit"]');

    // Assert that UI displays the failure and retry control
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes("uploading attachments failed") ||
          text.includes("Simulated network upload failure") ||
          text.includes("RETRY UPLOADING ATTACHMENTS")
        );
      },
      { timeout: 12000 }
    );

    // Strict assertions: URL must still be on the create page, not the listings page!
    assert.ok(
      page.url().includes("/seller/businesses/create"),
      `Page must stay on create page after upload failure! (Current URL: ${page.url()})`
    );

    // Extract created business ID from the UI message or button
    createdBusinessId = await page.evaluate(() => {
      const match = document.body.innerText.match(/ID:\s*#?(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    });
    assert.ok(createdBusinessId, "Listing ID must be displayed in the upload failure message");
    console.log(`  ✓ UI displays failure message for listing ID: #${createdBusinessId}`);

    // Assert retry control is present
    const retryBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("RETRY UPLOADING ATTACHMENTS")) || null;
    });
    assert.ok(retryBtn.asElement(), "Retry upload button must be visible in UI");

    // Click actual retry control
    console.log("  -> Clicking retry upload control...");
    await retryBtn.asElement().click();

    // Confirm upload success: user should be redirected to /seller/businesses
    await page.waitForFunction(
      () => window.location.pathname.endsWith("/seller/businesses"),
      { timeout: 12000 }
    );
    console.log(`  ✓ Retry succeeded and redirected to: ${page.url()}`);

    // Disable request interception
    page.off("request", requestHandler);
    await page.setRequestInterception(false);

    // Assert that EXACTLY one listing was created and its ID stayed the same
    const sellerListings = await apiGet(`/businesses/seller/${sellerUserId}`, sellerToken);
    assert.ok(sellerListings.ok, "Failed to get seller businesses via API");
    const matchingListings = sellerListings.data.data.filter((b) => b.title === listingTitle);
    assert.equal(matchingListings.length, 1, "Exactly ONE listing must exist (no duplicate on retry)");
    assert.equal(matchingListings[0].id, createdBusinessId, "Listing ID must remain identical on retry");

    // Confirm file was successfully attached to the listing
    const attachedFiles = await apiGet(`/businesses/${createdBusinessId}/files`, sellerToken);
    assert.ok(attachedFiles.ok, "Failed to fetch listing files");
    docFile = attachedFiles.data.data?.find((f) => f.originalName === "audit_sample.pdf");
    assert.ok(docFile, "audit_sample.pdf must be attached to the listing after retry");
    console.log(`  ✓ Asserted: Exactly one listing created with ID #${createdBusinessId}; attachment saved.`);

    // ──────────────────────────────────────────────────────────────────────────
    // FLOW B: PERSISTED EDITS AND OPTIONAL FIELD CLEARING
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n[FLOW B] Testing Listing Edits Persistence & Optional-Field Clearing...");

    // Find and click the Edit button for our listing
    await page.goto(`${FRONTEND_URL}/seller/businesses`, { waitUntil: "networkidle2" });
    await page.waitForSelector("table");

    const editBtn = await page.evaluateHandle((targetId) => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      const targetRow = rows.find((r) => r.innerText.includes(String(targetId)));
      if (!targetRow) return null;
      const btns = Array.from(targetRow.querySelectorAll("button"));
      return btns.find((b) => b.innerText.toLowerCase().includes("edit")) || null;
    }, createdBusinessId);
    assert.ok(editBtn.asElement(), "Edit button for listing must exist");
    await editBtn.asElement().click();

    // Wait for Edit modal to appear
    await page.waitForSelector('input[name="address"]', { timeout: 6000 });

    // 1. Modify Address, Business Age, Employees, Reason for Selling
    const newAddress = "Level 15, Parkland Tower, Colombo 02";
    const newAge = "8";
    const newEmployees = "32";
    const newReason = "Founder retirement and relocation";

    await page.evaluate(
      ({ addr, age, emp, reason }) => {
        function setInputValue(selector, value) {
          const input = document.querySelector(selector);
          if (!input) return;
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          ).set;
          nativeSetter.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }

        setInputValue('input[name="address"]', addr);
        setInputValue('input[name="businessAgeYears"]', age);
        setInputValue('input[name="numberOfEmployees"]', emp);
        setInputValue('input[name="reasonForSelling"]', reason);
      },
      { addr: newAddress, age: newAge, emp: newEmployees, reason: newReason }
    );

    // Click Save Changes button
    const saveBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Save Changes")) || null;
    });
    assert.ok(saveBtn.asElement(), "Save Changes button must be present in edit modal");
    await saveBtn.asElement().click();

    // Wait for modal to close
    await page.waitForFunction(
      () => !document.querySelector('input[name="address"]'),
      { timeout: 8000 }
    );
    console.log("  ✓ Edits submitted. Reloading page to assert persistence...");

    // Reload page and re-open modal to assert persisted values
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector("table");

    const editBtnAfterReload = await page.evaluateHandle((targetId) => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      const targetRow = rows.find((r) => r.innerText.includes(String(targetId)));
      if (!targetRow) return null;
      const btns = Array.from(targetRow.querySelectorAll("button"));
      return btns.find((b) => b.innerText.toLowerCase().includes("edit")) || null;
    }, createdBusinessId);
    await editBtnAfterReload.asElement().click();
    await page.waitForSelector('input[name="address"]', { timeout: 6000 });

    const valuesAfterReload = await page.evaluate(() => {
      return {
        address: document.querySelector('input[name="address"]')?.value,
        age: document.querySelector('input[name="businessAgeYears"]')?.value,
        employees: document.querySelector('input[name="numberOfEmployees"]')?.value,
        reason: document.querySelector('input[name="reasonForSelling"]')?.value,
      };
    });

    assert.equal(valuesAfterReload.address, newAddress, "Address must persist after reload");
    assert.equal(valuesAfterReload.age, newAge, "Business age must persist after reload");
    assert.equal(valuesAfterReload.employees, newEmployees, "Employee count must persist after reload");
    assert.equal(valuesAfterReload.reason, newReason, "Reason for selling must persist after reload");
    console.log("  ✓ Persisted edits confirmed across page reload.");

    // 2. Clear optional fields (reasonForSelling) and assert it remains cleared after reload
    console.log("  -> Clearing optional field (reasonForSelling)...");
    await page.evaluate(() => {
      const input = document.querySelector('input[name="reasonForSelling"]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        ).set;
        nativeSetter.call(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    const saveClearBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Save Changes")) || null;
    });
    await saveClearBtn.asElement().click();
    await page.waitForFunction(() => !document.querySelector('input[name="address"]'), { timeout: 8000 });

    // Reload page again
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector("table");

    const editBtnAfterClear = await page.evaluateHandle((targetId) => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      const targetRow = rows.find((r) => r.innerText.includes(String(targetId)));
      if (!targetRow) return null;
      const btns = Array.from(targetRow.querySelectorAll("button"));
      return btns.find((b) => b.innerText.toLowerCase().includes("edit")) || null;
    }, createdBusinessId);
    await editBtnAfterClear.asElement().click();
    await page.waitForSelector('input[name="address"]', { timeout: 6000 });

    const valuesAfterClear = await page.evaluate(() => {
      return document.querySelector('input[name="reasonForSelling"]')?.value;
    });
    assert.equal(valuesAfterClear, "", "Optional field (reasonForSelling) must remain empty/cleared after reload");
    console.log("  ✓ Cleared optional field remains cleared across page reload.");

    // Close modal
    await page.keyboard.press("Escape");

    // Clear session for officer test
    await page.evaluate(() => localStorage.clear());
    await page.deleteCookie(...(await page.cookies()));

    // ──────────────────────────────────────────────────────────────────────────
    // FLOW C: OFFICER DOCUMENT ACCESS & UNAUTHORIZED REJECTION
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n[FLOW C] Testing Officer Document Access & Unauthorized Rejection...");

    // Sign in as the assigned officer
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[type="email"]');
    await new Promise((r) => setTimeout(r, 600));
    await page.type('input[type="email"]', officerEmail);
    await page.type('input[type="password"]', officerPass);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 10000 });

    // Navigate to the officer review page for our business
    await page.goto(`${FRONTEND_URL}/verification-officer/review/${createdBusinessId}`, { waitUntil: "networkidle2" });
    await page.waitForSelector("h1, h2");

    // Do NOT stub window.open: test real document window/tab opening
    await page.evaluate(() => {
      window.confirm = () => true;
      window.alert = () => {};
    });

    // Assert that the page displays the uploaded document
    await page.waitForFunction(
      () => document.body.innerText.includes("audit_sample.pdf") || document.body.innerText.includes("Inspect File"),
      { timeout: 8000 }
    );

    // Click the actual Inspect File button and verify a real document tab opens
    const inspectBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Inspect File")) || null;
    });
    assert.ok(inspectBtn.asElement(), "Inspect File button must exist for uploaded document");

    console.log("  -> Clicking Inspect File button to verify a real document tab opens...");
    const newTargetPromise = browser.waitForTarget((target) => target.opener() === page.target());
    await inspectBtn.asElement().click();
    const newTarget = await newTargetPromise;
    const docPage = await newTarget.page();
    assert.ok(docPage, "A real document tab/window must open upon clicking Inspect File");

    // Wait until document tab has navigated to blob: URL
    await docPage.waitForFunction(() => window.location.href.startsWith("blob:"), { timeout: 10000 });
    const openedDocUrl = docPage.url();
    assert.ok(
      openedDocUrl.startsWith("blob:"),
      `Document tab must navigate to blob: URL (Got: ${openedDocUrl})`
    );

    // Verify document content rendered in real tab matches uploaded content
    const realTabContent = await docPage.evaluate(async () => {
      const resp = await fetch(window.location.href);
      return await resp.text();
    });
    assert.ok(
      realTabContent.includes("sample audit document"),
      "Document content inside opened tab must match uploaded valid PDF fixture"
    );
    console.log("  ✓ Real document tab opened visibly with matching fixture content.");

    // Close the document tab
    await docPage.close();

    // Assert anonymous access is denied (401 or 403)
    const anonymousFetch = await fetch(`${BACKEND_URL}/verification/files/${docFile.id}`);
    assert.ok(
      anonymousFetch.status === 401 || anonymousFetch.status === 403,
      `Anonymous request to private document must return 401 or 403 (Got: ${anonymousFetch.status})`
    );
    console.log("  ✓ Anonymous access to private document strictly denied.");

    // Log in as an unrelated buyer and verify private-document access is denied (403)
    const buyerLoginRes = await apiPost("/auth/login", { email: unverifiedEmail, password: unverifiedPass });
    assert.ok(buyerLoginRes.ok, "Unrelated buyer login failed");
    const unrelatedBuyerToken = buyerLoginRes.data.data.token;

    const unrelatedBuyerFetch = await fetch(`${BACKEND_URL}/verification/files/${docFile.id}`, {
      headers: { Authorization: `Bearer ${unrelatedBuyerToken}` },
    });
    assert.equal(
      unrelatedBuyerFetch.status,
      403,
      `Unrelated buyer access to private document must return 403 Forbidden (Got: ${unrelatedBuyerFetch.status})`
    );
    console.log("  ✓ Unrelated buyer access to private document strictly denied (403 Forbidden).");

    // Officer approves verification
    await page.evaluate(() => {
      window.confirm = () => true;
      window.alert = () => {};
    });
    const approveVerifBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Approve Verification")) || null;
    });
    assert.ok(approveVerifBtn.asElement(), "Officer 'Approve Verification' button must exist");
    await approveVerifBtn.asElement().click();

    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Business verified successfully") ||
        window.location.pathname.includes("/verification-officer/dashboard"),
      { timeout: 12000 }
    );
    console.log("  ✓ Officer approved listing verification.");

    // Clear session for admin flow
    await page.evaluate(() => localStorage.clear());
    await page.deleteCookie(...(await page.cookies()));

    // ──────────────────────────────────────────────────────────────────────────
    // FLOW D: ADMIN PUBLICATION AND ANONYMOUS VISIBILITY
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n[FLOW D] Testing Admin Publication & Anonymous Marketplace Visibility...");

    // 1. Verify listing is hidden from an anonymous visitor before admin approval
    const anonContext = await browser.createBrowserContext();
    const anonPage = await anonContext.newPage();
    await anonPage.setViewport({ width: 1280, height: 900 });
    await anonPage.evaluateOnNewDocument(() => {
      window.confirm = () => true;
      window.alert = () => {};
    });

    await anonPage.goto(`${FRONTEND_URL}/businesses`, { waitUntil: "networkidle2" });
    const isVisibleAnonymouslyBefore = await anonPage.evaluate((title) => {
      return document.body.innerText.includes(title);
    }, listingTitle);
    assert.equal(
      isVisibleAnonymouslyBefore,
      false,
      "Officer-approved listing must remain HIDDEN from anonymous visitors before admin publication"
    );
    console.log("  ✓ Confirmed: Listing is invisible to anonymous visitor before Admin publication.");

    // 2. Admin signs in and approves publication
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[type="email"]');
    await new Promise((r) => setTimeout(r, 600));
    await page.type('input[type="email"]', ADMIN_EMAIL);
    await page.type('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 10000 });

    // Navigate to Admin Pending Businesses page
    await page.goto(`${FRONTEND_URL}/admin/businesses/pending`, { waitUntil: "networkidle2" });
    await page.waitForSelector("table");

    const adminApproveBtn = await page.evaluateHandle((targetTitle) => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      const targetRow = rows.find((r) => r.innerText.includes(targetTitle));
      if (!targetRow) return null;
      const btns = Array.from(targetRow.querySelectorAll("button"));
      return btns.find((b) => b.innerText.includes("Approve")) || null;
    }, listingTitle);
    assert.ok(adminApproveBtn.asElement(), "Admin Approve button must exist in pending queue for listing");

    // Click actual admin publication approval button
    console.log("  -> Clicking Admin publication Approve button...");
    await adminApproveBtn.asElement().click();

    // Verify row disappears from pending table
    await page.waitForFunction(
      (targetTitle) => !document.body.innerText.includes(targetTitle),
      { timeout: 8000 },
      listingTitle
    );
    console.log("  ✓ Admin publication approved; listing removed from pending queue.");

    // 3. Verify exact listing becomes visible in fresh anonymous browser context
    await anonPage.goto(`${FRONTEND_URL}/businesses`, { waitUntil: "networkidle2" });
    await anonPage.waitForFunction(
      (title) => document.body.innerText.includes(title),
      { timeout: 10000 },
      listingTitle
    );
    console.log(`  ✓ Exact listing "${listingTitle}" is now visible in anonymous marketplace!`);

    // Verify public listing details page renders anonymously
    await anonPage.goto(`${FRONTEND_URL}/businesses/${createdBusinessId}`, { waitUntil: "networkidle2" });
    await anonPage.waitForSelector("h1, h2");
    const detailText = await anonPage.evaluate(() => document.body.innerText);
    assert.ok(
      detailText.includes(listingTitle),
      "Public listing detail page must display listing title"
    );
    console.log("  ✓ Anonymous visitor can view full public details of published listing.");

    await anonContext.close();

    console.log("\n===============================================================");
    console.log("  ✓ ALL 5 REAL BROWSER FLOWS PASSED STRICT ASSERTIONS!        ");
    console.log("===============================================================");
  } finally {
    await browser.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("\n❌ BROWSER VERIFICATION FAILED:", err);
  process.exit(1);
});
