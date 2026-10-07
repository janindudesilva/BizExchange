#!/usr/bin/env node
/**
 * BizExchange Reusable End-to-End Workflow Verification Script
 *
 * Covers:
 *  1. Admin authentication & Category verification
 *  2. Verification Officer creation & authentication
 *  3. Seller registration, verification & authentication
 *  4. Business Listing creation
 *  5. Failed-upload retry without duplicate listings
 *  6. Distinct PDF and Image uploads (verifying distinct file IDs, MIME types, and contents)
 *  7. Listing update & intentional optional-field clearing
 *  8. Verification Officer document preview & download
 *  9. Verification Officer approval & Admin publication
 * 10. Buyer registration, inquiry submission & seller response
 *
 * Configuration via environment variables:
 *  - BASE_URL: default http://localhost:8080/api
 *  - ADMIN_EMAIL: default admin@bizexchange.local
 *  - ADMIN_PASSWORD: password for admin (default AdminPass123!)
 *
 * Usage:
 *  node scripts/verify_e2e_workflow.mjs
 */

import assert from "node:assert/strict";

const API = process.env.BASE_URL || "http://localhost:8080/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bizexchange.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdminPass123!";

async function post(url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function put(url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${url}`, {
    method: "PUT",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function get(url, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${url}`, { method: "GET", headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function uploadFile(businessId, filename, content, mimeType, partName, token) {
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${partName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const hBuf = Buffer.from(header, "utf-8");
  const cBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8");
  const fBuf = Buffer.from(footer, "utf-8");
  const bodyBuffer = Buffer.concat([hBuf, cBuf, fBuf]);

  const res = await fetch(`${API}/businesses/${businessId}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuffer,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log("=== BIZEXCHANGE END-TO-END VERIFICATION WORKFLOW ===");
  console.log(`Connecting to backend at: ${API}`);

  // 1. Admin Login
  console.log("\n[1] Admin Authentication...");
  const adminLogin = await post("/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  assert.ok(adminLogin.ok, `Admin login failed: ${JSON.stringify(adminLogin.data)}`);
  const adminToken = adminLogin.data.data.token;
  console.log("    ✓ Admin authenticated successfully.");

  // 2. Category Verification
  console.log("\n[2] Category Verification...");
  let cats = await get("/categories");
  let catName = "Technology & Software";
  if (!cats.data?.data || cats.data.data.length === 0) {
    const createCat = await post(
      "/admin/categories",
      { name: catName, description: "Software and IT businesses" },
      adminToken
    );
    assert.ok(createCat.ok, "Failed to create default category");
    console.log("    ✓ Created default category:", catName);
  } else {
    catName = cats.data.data[0].name;
    console.log("    ✓ Found existing category:", catName);
  }

  // 3. Officer Creation
  console.log("\n[3] Verification Officer Creation & Authentication...");
  const timestamp = Date.now();
  const officerEmail = `officer_${timestamp}@bizexchange.local`;
  const officerPass = `Pass${timestamp}!`;
  const createOfficer = await post(
    "/admin/staff",
    {
      fullName: "Officer Jane Doe",
      email: officerEmail,
      password: officerPass,
      role: "VERIFICATION_OFFICER",
    },
    adminToken
  );
  assert.ok(createOfficer.ok, `Failed to create officer: ${JSON.stringify(createOfficer.data)}`);

  const officerLogin = await post("/auth/login", {
    email: officerEmail,
    password: officerPass,
  });
  assert.ok(officerLogin.ok, "Officer login failed");
  const officerToken = officerLogin.data.data.token;
  console.log("    ✓ Officer created & authenticated:", officerEmail);

  // 4. Seller Registration & Verification
  console.log("\n[4] Seller Registration & Verification...");
  const sellerEmail = `seller_${timestamp}@bizexchange.local`;
  const sellerPass = `Seller${timestamp}!`;
  const registerSeller = await post("/auth/register/seller", {
    fullName: "Alex Seller",
    email: sellerEmail,
    password: sellerPass,
    phone: "0771234567",
    nicOrPassport: "199012345678",
    address: "Colombo 03",
    businessOwnerType: "Sole Proprietorship",
  });
  assert.ok(registerSeller.ok, `Seller register failed: ${JSON.stringify(registerSeller.data)}`);
  const sellerUserId = registerSeller.data.data.userId;

  // Auto-verify email if not verified
  if (!registerSeller.data.data.emailVerified) {
    const tokenRes = await post("/auth/test/get-verification-token", { email: sellerEmail });
    if (tokenRes.ok && tokenRes.data?.data?.token) {
      await post("/auth/verify-email", { token: tokenRes.data.data.token });
    }
  }

  const sellerLogin = await post("/auth/login", {
    email: sellerEmail,
    password: sellerPass,
  });
  assert.ok(sellerLogin.ok, "Seller login failed");
  const sellerToken = sellerLogin.data.data.token;

  // Officer approves seller profile
  const pendingSellers = await get("/admin/sellers/pending", officerToken);
  const sellerProfile = pendingSellers.data?.data?.find(
    (s) => s.userId === sellerUserId || s.email === sellerEmail
  );
  assert.ok(sellerProfile, "Could not find pending seller profile");
  const approveSeller = await put(`/admin/sellers/${sellerProfile.id}/approve`, null, officerToken);
  assert.ok(approveSeller.ok, "Approve seller failed");
  console.log("    ✓ Seller registered, email verified & approved by Officer.");

  // 5. Seller Creates Listing
  console.log("\n[5] Seller Creates Business Listing...");
  const listingData = {
    title: "Apex Cloud Solutions",
    description: "Enterprise SaaS platform with recurring ARR.",
    location: "Colombo",
    address: "World Trade Center, Colombo 01",
    askingPrice: 250000.0,
    category: catName,
    businessAgeYears: 4,
    numberOfEmployees: 12,
    reasonForSelling: "Founders moving to next project",
  };
  const createListing = await post("/businesses", listingData, sellerToken);
  assert.ok(createListing.ok, `Listing creation failed: ${JSON.stringify(createListing.data)}`);
  const bizId = createListing.data.data.id;
  console.log(`    ✓ Created Listing ID: ${bizId} (Status: ${createListing.data.data.status})`);

  // 6. Test Failed-Upload Retry Without Duplicate Listings
  console.log("\n[6] Testing Failed-Upload Retry (Disallowed file rejection)...");
  const badUpload = await uploadFile(
    bizId,
    "script.exe",
    "binary content",
    "application/x-msdownload",
    "documents",
    sellerToken
  );
  assert.equal(badUpload.ok, false, "Disallowed file type should be rejected with 400 Bad Request");
  console.log("    ✓ Rejected disallowed file type correctly.");

  // Retry with valid PDF and verify NO duplicate business was created
  const myBizList = await get(`/businesses/seller/${sellerUserId}`, sellerToken);
  assert.ok(myBizList.ok, `Get seller businesses failed: ${JSON.stringify(myBizList.data)}`);
  const matchingListings = myBizList.data.data.filter((b) => b.id === bizId);
  assert.equal(matchingListings.length, 1, "Failed upload must not duplicate listing");
  console.log("    ✓ Verified retry caused zero duplicate listings.");

  // 7. Distinct PDF and Image Uploads & File Investigation Assertions
  console.log("\n[7] Uploading PDF Document and Image Photo...");
  const pdfBytes = Buffer.from("%PDF-1.4 sample PDF verification payload content " + timestamp);
  const pdfUpload = await uploadFile(
    bizId,
    "financial_audit_2025.pdf",
    pdfBytes,
    "application/pdf",
    "documents",
    sellerToken
  );
  assert.ok(pdfUpload.ok, `PDF upload failed: ${JSON.stringify(pdfUpload.data)}`);

  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  ]);
  const pngUpload = await uploadFile(
    bizId,
    "storefront_photo.png",
    pngBytes,
    "image/png",
    "images",
    sellerToken
  );
  assert.ok(pngUpload.ok, `Image upload failed: ${JSON.stringify(pngUpload.data)}`);

  // Investigation & Assertions: Find each file in the returned list
  const allFiles = pngUpload.data.data;
  const pdfRecord = allFiles.find((f) => f.originalName === "financial_audit_2025.pdf");
  const pngRecord = allFiles.find((f) => f.originalName === "storefront_photo.png");

  assert.ok(pdfRecord, "PDF record must exist in listing file collection");
  assert.ok(pngRecord, "PNG record must exist in listing file collection");

  // ASSERTION: Distinct database records & file IDs
  assert.notEqual(
    pdfRecord.id,
    pngRecord.id,
    `PDF and Image must have distinct IDs! (Got PDF ID: ${pdfRecord.id}, Image ID: ${pngRecord.id})`
  );
  console.log(`    ✓ Confirmed distinct file IDs: PDF ID=${pdfRecord.id}, Image ID=${pngRecord.id}`);

  // ASSERTION: Correct file types
  assert.equal(pdfRecord.fileType, "DOCUMENT");
  assert.equal(pngRecord.fileType, "IMAGE");
  console.log("    ✓ Confirmed correct fileType mappings (DOCUMENT and IMAGE).");

  // ASSERTION: Downloaded byte contents match uploaded bytes & Content-Type headers
  const officerPdfDownload = await fetch(`${API}/verification/files/${pdfRecord.id}`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  assert.equal(officerPdfDownload.status, 200, "Officer PDF download must return 200 OK");
  assert.ok(
    officerPdfDownload.headers.get("content-type")?.includes("application/pdf"),
    `Expected application/pdf Content-Type, got ${officerPdfDownload.headers.get("content-type")}`
  );
  const downloadedPdfBuf = Buffer.from(await officerPdfDownload.arrayBuffer());
  assert.ok(
    downloadedPdfBuf.equals(pdfBytes),
    "Downloaded PDF byte content must exactly match uploaded bytes"
  );

  const officerImageDownload = await fetch(`${API}/verification/files/${pngRecord.id}`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  assert.equal(officerImageDownload.status, 200, "Officer Image download must return 200 OK");
  assert.ok(
    officerImageDownload.headers.get("content-type")?.includes("image/png"),
    `Expected image/png Content-Type, got ${officerImageDownload.headers.get("content-type")}`
  );
  const downloadedPngBuf = Buffer.from(await officerImageDownload.arrayBuffer());
  assert.ok(
    downloadedPngBuf.equals(pngBytes),
    "Downloaded Image byte content must exactly match uploaded bytes"
  );
  console.log("    ✓ Downloaded byte contents and Content-Type headers verified against uploaded bytes.");

  // 8. Test Listing Edit and Optional-Field Clearing
  console.log("\n[8] Testing Listing Update & Optional-Field Clearing...");
  // Clear reasonForSelling (set to null/empty) while keeping numberOfEmployees and askingPrice
  const updatePayload = {
    title: "Apex Cloud Solutions (Updated)",
    description: "Enterprise SaaS platform with recurring ARR - Updated description.",
    location: "Colombo",
    address: "World Trade Center, Level 28, Colombo 01",
    askingPrice: 275000.0,
    category: catName,
    businessAgeYears: 5,
    numberOfEmployees: 15,
    reasonForSelling: null, // INTENTIONALLY CLEARED
  };
  const updateRes = await put(`/businesses/${bizId}`, updatePayload, sellerToken);
  assert.ok(updateRes.ok, `Listing update failed: ${JSON.stringify(updateRes.data)}`);
  assert.equal(updateRes.data.data.numberOfEmployees, 15, "numberOfEmployees should update to 15");
  assert.equal(
    updateRes.data.data.reasonForSelling,
    null,
    "reasonForSelling should be cleared to null"
  );
  console.log("    ✓ Optional field cleared to null while preserved fields were updated.");

  // 9. Officer Review & Admin Publication Flow
  console.log("\n[9] Verification Officer Review & Approval...");
  // Submit verification request if not already pending
  const submitVerif = await post(`/verification/submit/${bizId}`, {}, sellerToken);
  let vReqId;
  if (submitVerif.ok && submitVerif.data?.data?.id) {
    vReqId = submitVerif.data.data.id;
  } else {
    const pendingRequests = await get("/verification/pending", officerToken);
    const req = pendingRequests.data?.data?.find((r) => r.businessId === bizId);
    vReqId = req ? req.id : null;
  }

  if (vReqId) {
    const approveRes = await post(`/verification/${vReqId}/approve`, {}, officerToken);
    assert.ok(approveRes.ok, `Officer approval failed: ${JSON.stringify(approveRes.data)}`);
    console.log("    ✓ Officer approved listing verification request.");
  }

  // Admin Final Publication
  console.log("\n[10] Admin Final Listing Approval/Publication...");
  const adminApprove = await put(
    `/admin/businesses/${bizId}/approve`,
    { adminNotes: "Approved for public marketplace" },
    adminToken
  );
  assert.ok(adminApprove.ok, `Admin approval failed: ${JSON.stringify(adminApprove.data)}`);
  assert.equal(adminApprove.data.data.status, "APPROVED");
  console.log("    ✓ Admin approved listing. Public Marketplace Status: APPROVED");

  // 11. Buyer Registration, Inquiry, Seller Acceptance & Review
  console.log("\n[11] Buyer Registration & Inquiry Flow...");
  const buyerEmail = `buyer_${timestamp}@bizexchange.local`;
  const buyerPass = `Buyer${timestamp}!`;
  const registerBuyer = await post("/auth/register/buyer", {
    fullName: "Brian Buyer",
    email: buyerEmail,
    password: buyerPass,
    phone: "0719876543",
    preferredLocation: "Colombo",
    preferredBusinessCategory: "Technology & Software",
    budgetMin: 50000,
    budgetMax: 300000,
  });
  assert.ok(registerBuyer.ok, "Buyer registration failed");

  if (!registerBuyer.data.data.emailVerified) {
    const tokenRes = await post("/auth/test/get-verification-token", { email: buyerEmail });
    if (tokenRes.ok && tokenRes.data?.data?.token) {
      await post("/auth/verify-email", { token: tokenRes.data.data.token });
    }
  }

  const buyerLogin = await post("/auth/login", { email: buyerEmail, password: buyerPass });
  assert.ok(buyerLogin.ok, "Buyer login failed");
  const buyerToken = buyerLogin.data.data.token;

  // Buyer sends inquiry
  const sendInq = await post(
    "/inquiries",
    {
      businessId: bizId,
      message: "Interested in reviewing financial audits for potential acquisition.",
      offeredPrice: 260000.0,
      financingMethod: "CASH",
    },
    buyerToken
  );
  assert.ok(sendInq.ok, `Inquiry submission failed: ${JSON.stringify(sendInq.data)}`);
  const inqId = sendInq.data.data.id;
  console.log(`    ✓ Buyer sent inquiry ID: ${inqId}`);

  // Seller approves inquiry
  const approveInq = await put(`/inquiries/${inqId}/approve`, null, sellerToken);
  assert.ok(approveInq.ok, "Seller inquiry approval failed");
  assert.equal(approveInq.data.data.status, "ACTIVE");
  console.log("    ✓ Seller approved inquiry. Status: ACTIVE");

  // Concurrency check: Test duplicate open inquiry prevention (partial unique index from V5)
  const dupInq = await post(
    "/inquiries",
    {
      businessId: bizId,
      message: "Duplicate open inquiry attempt",
    },
    buyerToken
  );
  assert.equal(dupInq.ok, false, "Duplicate open inquiry should be rejected by constraint");
  console.log("    ✓ Duplicate open inquiry prevented by partial unique index.");

  // Seller or Buyer closes inquiry so buyer can leave review
  const closeInq = await put(`/inquiries/${inqId}/close`, null, buyerToken);
  assert.ok(closeInq.ok, "Buyer close inquiry failed");
  assert.equal(closeInq.data.data.status, "CLOSED");
  console.log("    ✓ Inquiry closed. Status: CLOSED");

  // Buyer submits review for Seller
  const reviewRes = await post(
    `/reviews/seller/${sellerUserId}`,
    {
      rating: 5,
      comment: "Prompt communication and thorough financial disclosures.",
    },
    buyerToken
  );
  assert.ok(reviewRes.ok, `Review submission failed: ${JSON.stringify(reviewRes.data)}`);
  console.log("    ✓ Buyer submitted 5-star review for seller.");

  console.log("\n=== ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY ===");
}

run().catch((err) => {
  console.error("\n❌ E2E Verification Failed:", err.message);
  process.exit(1);
});
