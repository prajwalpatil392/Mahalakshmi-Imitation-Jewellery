// ============================================================
// MAHALAKSHMI RENTALS — STANDALONE GOOGLE APPS SCRIPT
// Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

const SECRET_KEY        = "ML_RENTALS_2024";
const MAIN_SHEET        = "Sheet1";
const ARCHIVE_SHEET     = "Archive";
const BACKUP_SHEET      = "Backup";
const SUBSCRIPTION_SHEET = "Subscriptions";
const SPREADSHEET_ID    = "1H728QUmyN87qv7C6T5dQtOPrCO77ZXCFcLzXaPrinx8";
const SUB_HEADERS       = ["ID", "User", "ActivatedDate", "ExpiryDate", "LastRenewalDate", "Price", "Status", "History"];
const MAIN_HEADERS      = ["ID", "Name", "Phone", "Address", "Receipt#", "Item", "Total", "Advance", "Balance", "Deposit", "From", "To", "Note", "PhotoURL", "Status", "RetDate", "User"];

// ============================================================
// ENTRY POINTS
// ============================================================

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

// ============================================================
// EDITOR TESTING — select testDoPost() and click Run
// Change action / data below to test different operations.
// ============================================================

function testDoPost() {
  const fakeEvent = {
    parameter: {
      key: SECRET_KEY,
      action: "get"
      // Examples for other actions:
      // action: "add",  data: JSON.stringify({ name:"Test User", phone:"9999999999", address:"Chennai", receiptNo:"R001", jewel:"Necklace", total:5000, advance:2000, deposit:500, from:"2026-01-01", to:"2026-06-01", note:"Test", photoUrls:"", user:"Admin" })
      // action: "edit", data: JSON.stringify({ id:"R-123", name:"Updated", phone:"9999999999", address:"Chennai", receiptNo:"R001", jewel:"Ring", total:3000, advance:1000, deposit:200, from:"2026-01-01", to:"2026-06-01", note:"", photoUrls:"", user:"Admin" })
      // action: "return",  id: "R-123"
      // action: "delete",  id: "R-123"
      // action: "getDeleted"
      // action: "restore", data: JSON.stringify({ id:"R-123" })
      // action: "permanentlyDelete", data: JSON.stringify({ id:"R-123" })
      // action: "clearArchive"
      // action: "getSubscription", user: "Admin"
      // action: "saveSubscription", data: JSON.stringify({ user:"Admin", price:999, status:"active" })
    }
  };

  const result = handleRequest(fakeEvent);
  Logger.log("✅ Test result: " + (result ? result.getContent() : "null"));
}

// ============================================================
// MAIN REQUEST HANDLER
// ============================================================

function handleRequest(e) {
  try {
    // Guard: editor-run produces undefined e
    if (!e || !e.parameter) {
      return jsonRes({ ok: false, error: "No request received. Use testDoPost() to test from the editor." });
    }

    // Auth check
    if (e.parameter.key !== SECRET_KEY) {
      return jsonRes({ ok: false, error: "Unauthorized" });
    }

    const action = String(e.parameter.action || "").trim();
    if (!action) {
      return jsonRes({ ok: false, error: "No action specified" });
    }

    // Open spreadsheet
    let ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (err) {
      return jsonRes({ ok: false, error: "Cannot access spreadsheet: " + err.toString() });
    }

    // Ensure all sheets exist
    const sheet        = getOrCreateSheet(ss, MAIN_SHEET,    MAIN_HEADERS);
    const archiveSheet = getOrCreateSheet(ss, ARCHIVE_SHEET, MAIN_HEADERS);
    const backupSheet  = getOrCreateSheet(ss, BACKUP_SHEET,  ["Timestamp"].concat(MAIN_HEADERS).concat(["Action"]));

    // Dispatch
    switch (action) {
      case "get":               return getRentals(sheet);
      case "getDeleted":        return getDeletedRecords(archiveSheet);
      case "add":               return addRental(sheet, backupSheet, safeParse(e.parameter.data));
      case "edit":              return editRental(sheet, safeParse(e.parameter.data));
      case "return":            return updateStatus(sheet, backupSheet, e.parameter.id, "returned");
      case "updatePhoto":       return updatePhoto(sheet, safeParse(e.parameter.data));
      case "delete":            return archiveRecord(sheet, archiveSheet, e.parameter.id);
      case "restore": {
        const d = safeParse(e.parameter.data);
        return restoreFromArchive(sheet, archiveSheet, d.id || e.parameter.id);
      }
      case "permanentlyDelete": {
        const d = safeParse(e.parameter.data);
        return permanentlyDeleteFromArchive(archiveSheet, d.id || e.parameter.id);
      }
      case "clearArchive":      return clearEntireArchive(archiveSheet);
      case "getSubscription": {
        const user = e.parameter.user || safeParse(e.parameter.data).user;
        return getSubscription(ss, user);
      }
      case "saveSubscription":  return saveSubscription(ss, safeParse(e.parameter.data));
      default:
        return jsonRes({ ok: false, error: "Unknown action: " + action });
    }

  } catch (error) {
    Logger.log("❌ handleRequest error: " + error.toString());
    return jsonRes({ ok: false, error: "Handler error: " + error.toString() });
  }
}

// ============================================================
// SHEET HELPERS
// ============================================================

/**
 * Returns an existing sheet by name, or creates it with headers.
 */
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    Logger.log("✅ Created sheet: " + name);
  }
  return sheet;
}

/**
 * Finds the cell in column A that exactly matches the given ID.
 * Returns the Range cell, or null if not found.
 */
function findIdCell(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  return sheet.getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(String(id).trim())
    .matchEntireCell(true)
    .findNext();
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

function getRentals(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonRes({ ok: true, data: [] });

    const data   = sheet.getRange(2, 1, lastRow - 1, 17).getValues();
    const today  = new Date();
    today.setHours(0, 0, 0, 0);

    const rentals  = [];
    const seenIds  = new Set();

    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      if (!r[0] && !r[1]) continue;                          // skip blank rows

      const recordId = String(r[0] || "").trim();
      if (seenIds.has(recordId)) {
        Logger.log("⚠️ Duplicate ID skipped: " + recordId + " (row " + (i + 2) + ")");
        continue;
      }
      seenIds.add(recordId);

      let status = String(r[14] || "active").trim();
      try {
        const toDate = new Date(r[11]);
        if (isValidDate(toDate) && status !== "returned" && toDate < today) {
          status = "overdue";
        }
      } catch (_) { /* keep existing status */ }

      rentals.push({
        id:        recordId,
        name:      String(r[1]  || ""),
        phone:     String(r[2]  || ""),
        address:   String(r[3]  || ""),
        receiptNo: String(r[4]  || ""),
        jewel:     String(r[5]  || ""),
        total:     toNum(r[6]),
        advance:   toNum(r[7]),
        balance:   toNum(r[8]),
        deposit:   toNum(r[9]),
        from:      formatDate(r[10]),
        to:        formatDate(r[11]),
        note:      String(r[12] || ""),
        photoUrls: String(r[13] || ""),
        status:    status,
        user:      String(r[16] || "System")
      });
    }

    return jsonRes({ ok: true, data: rentals.reverse() });
  } catch (error) {
    return jsonRes({ ok: false, error: "getRentals: " + error.toString() });
  }
}

function addRental(sheet, backupSheet, data) {
  try {
    if (!data || typeof data !== "object") {
      return jsonRes({ ok: false, error: "Invalid data format" });
    }

    const id      = String(data.id || "").trim() || ("R-" + new Date().getTime());
    const total   = toNum(data.total);
    const advance = toNum(data.advance);
    const balance = total - advance;

    const rowData = [
      id,
      String(data.name      || ""),
      String(data.phone     || ""),
      String(data.address   || ""),
      String(data.receiptNo || ""),
      String(data.jewel     || ""),
      total,
      advance,
      balance,
      toNum(data.deposit),
      String(data.from      || ""),
      String(data.to        || ""),
      String(data.note      || ""),
      String(data.photoUrls || ""),
      "active",
      "",
      String(data.user || "System")
    ];

    sheet.appendRow(rowData);

    // Backup
    try {
      backupSheet.appendRow([new Date().toISOString()].concat(rowData).concat(["ADD"]));
    } catch (backupErr) {
      Logger.log("⚠️ Backup failed (main save OK): " + backupErr.toString());
    }

    return jsonRes({ ok: true, id: id });
  } catch (error) {
    return jsonRes({ ok: false, error: "addRental: " + error.toString() });
  }
}

function editRental(sheet, data) {
  try {
    if (!data || typeof data !== "object") {
      return jsonRes({ ok: false, error: "Invalid data format" });
    }
    const id = String(data.id || "").trim();
    if (!id) return jsonRes({ ok: false, error: "No ID provided" });

    const foundCell = findIdCell(sheet, id);
    if (!foundCell) return jsonRes({ ok: false, error: "Record not found: " + id });

    const row     = foundCell.getRow();
    const total   = toNum(data.total);
    const advance = toNum(data.advance);

    // Update columns 2–14 and 17 (keep status col 15 and retDate col 16 unchanged)
    sheet.getRange(row, 2, 1, 13).setValues([[
      String(data.name      || ""),
      String(data.phone     || ""),
      String(data.address   || ""),
      String(data.receiptNo || ""),
      String(data.jewel     || ""),
      total,
      advance,
      total - advance,
      toNum(data.deposit),
      String(data.from      || ""),
      String(data.to        || ""),
      String(data.note      || ""),
      String(data.photoUrls || "")
    ]]);
    sheet.getRange(row, 17).setValue(String(data.user || "System"));

    return jsonRes({ ok: true, id: id });
  } catch (error) {
    return jsonRes({ ok: false, error: "editRental: " + error.toString() });
  }
}

function updateStatus(sheet, backupSheet, id, status) {
  try {
    if (!id) return jsonRes({ ok: false, error: "No ID provided" });

    const foundCell = findIdCell(sheet, id);
    if (!foundCell) return jsonRes({ ok: false, error: "Record not found: " + id });

    const row     = foundCell.getRow();
    const rowData = sheet.getRange(row, 1, 1, 17).getValues()[0];

    sheet.getRange(row, 15).setValue(status);
    sheet.getRange(row, 16).setValue(new Date());

    // Backup
    try {
      backupSheet.appendRow([new Date().toISOString()].concat(rowData).concat(["RETURN"]));
    } catch (backupErr) {
      Logger.log("⚠️ Backup failed (main save OK): " + backupErr.toString());
    }

    return jsonRes({ ok: true });
  } catch (error) {
    return jsonRes({ ok: false, error: "updateStatus: " + error.toString() });
  }
}

function updatePhoto(sheet, data) {
  try {
    if (!data || typeof data !== "object") {
      return jsonRes({ ok: false, error: "Invalid data format" });
    }
    const id = String(data.id || "").trim();
    if (!id) return jsonRes({ ok: false, error: "No ID provided" });

    const foundCell = findIdCell(sheet, id);
    if (!foundCell) return jsonRes({ ok: false, error: "Record not found: " + id });

    sheet.getRange(foundCell.getRow(), 14).setValue(String(data.url || ""));
    return jsonRes({ ok: true });
  } catch (error) {
    return jsonRes({ ok: false, error: "updatePhoto: " + error.toString() });
  }
}

// ============================================================
// ARCHIVE (SOFT DELETE / RECYCLE BIN)
// ============================================================

function archiveRecord(sheet, archiveSheet, id) {
  try {
    if (!id || id === "undefined") {
      return jsonRes({ ok: false, error: "No ID provided" });
    }

    const foundCell = findIdCell(sheet, id);
    if (!foundCell) return jsonRes({ ok: false, error: "Record not found: " + id });

    const rowIndex = foundCell.getRow();
    const rowData  = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

    archiveSheet.appendRow(rowData);
    sheet.deleteRow(rowIndex);

    Logger.log("✅ Archived record: " + id);
    return jsonRes({ ok: true, message: "Record moved to archive" });
  } catch (error) {
    Logger.log("❌ archiveRecord: " + error.toString());
    return jsonRes({ ok: false, error: "archiveRecord: " + error.toString() });
  }
}

function getDeletedRecords(archiveSheet) {
  try {
    const lastRow = archiveSheet.getLastRow();
    if (lastRow <= 1) return jsonRes({ ok: true, data: [] });

    const data    = archiveSheet.getRange(2, 1, lastRow - 1, 17).getValues();
    const deleted = [];
    const seenIds = new Set();

    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      if (!r[0] && !r[1]) continue;

      const recordId = String(r[0] || "").trim();
      if (seenIds.has(recordId)) {
        Logger.log("⚠️ Archive duplicate skipped: " + recordId);
        continue;
      }
      seenIds.add(recordId);

      deleted.push({
        id:        recordId,
        name:      String(r[1]  || ""),
        phone:     String(r[2]  || ""),
        address:   String(r[3]  || ""),
        receiptNo: String(r[4]  || ""),
        jewel:     String(r[5]  || ""),
        total:     toNum(r[6]),
        advance:   toNum(r[7]),
        balance:   toNum(r[8]),
        deposit:   toNum(r[9]),
        from:      formatDate(r[10]),
        to:        formatDate(r[11]),
        note:      String(r[12] || ""),
        photoUrls: String(r[13] || ""),
        status:    String(r[14] || "deleted"),
        user:      String(r[16] || "System")
      });
    }

    return jsonRes({ ok: true, data: deleted.reverse() });
  } catch (error) {
    return jsonRes({ ok: false, error: "getDeletedRecords: " + error.toString() });
  }
}

function restoreFromArchive(sheet, archiveSheet, id) {
  try {
    if (!id) return jsonRes({ ok: false, error: "No ID provided" });

    // Prevent duplicate: if already in main sheet, just remove from archive
    const existingCell = findIdCell(sheet, id);
    if (existingCell) {
      const dupCell = findIdCell(archiveSheet, id);
      if (dupCell) archiveSheet.deleteRow(dupCell.getRow());
      return jsonRes({ ok: true, message: "Record already active, removed from archive" });
    }

    const archiveCell = findIdCell(archiveSheet, id);
    if (!archiveCell) return jsonRes({ ok: false, error: "Record not found in archive: " + id });

    const archiveRow = archiveCell.getRow();
    const rowData    = archiveSheet.getRange(archiveRow, 1, 1, archiveSheet.getLastColumn()).getValues()[0];

    sheet.appendRow(rowData);
    archiveSheet.deleteRow(archiveRow);

    Logger.log("✅ Restored record: " + id);
    return jsonRes({ ok: true, message: "Record restored successfully" });
  } catch (error) {
    Logger.log("❌ restoreFromArchive: " + error.toString());
    return jsonRes({ ok: false, error: "restoreFromArchive: " + error.toString() });
  }
}

function permanentlyDeleteFromArchive(archiveSheet, id) {
  try {
    if (!id || id === "undefined") {
      return jsonRes({ ok: false, error: "No ID provided" });
    }

    const foundCell = findIdCell(archiveSheet, id);
    if (!foundCell) return jsonRes({ ok: false, error: "Record not found in archive" });

    archiveSheet.deleteRow(foundCell.getRow());
    return jsonRes({ ok: true, message: "Permanently deleted" });
  } catch (error) {
    Logger.log("❌ permanentlyDeleteFromArchive: " + error.toString());
    return jsonRes({ ok: false, error: "permanentlyDeleteFromArchive: " + error.toString() });
  }
}

function clearEntireArchive(archiveSheet) {
  try {
    const lastRow = archiveSheet.getLastRow();
    if (lastRow <= 1) return jsonRes({ ok: true, message: "Archive already empty", deleted: 0 });

    archiveSheet.deleteRows(2, lastRow - 1);
    Logger.log("✅ clearEntireArchive: deleted " + (lastRow - 1) + " rows");
    return jsonRes({ ok: true, message: "Archive cleared", deleted: lastRow - 1 });
  } catch (error) {
    Logger.log("❌ clearEntireArchive: " + error.toString());
    return jsonRes({ ok: false, error: "clearEntireArchive: " + error.toString() });
  }
}

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

function getSubscription(ss, user) {
  try {
    if (!user) return jsonRes({ ok: false, error: "User required" });

    const sheet = ss.getSheetByName(SUBSCRIPTION_SHEET);
    if (!sheet) return jsonRes({ ok: true, data: null });

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonRes({ ok: true, data: null });

    const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const sub  = rows.find(r => String(r[1]).trim() === String(user).trim());

    if (!sub) return jsonRes({ ok: true, data: null });

    return jsonRes({
      ok: true,
      data: {
        id:              String(sub[0]),
        user:            String(sub[1]),
        activatedDate:   sub[2],
        expiryDate:      sub[3],
        lastRenewalDate: sub[4],
        price:           toNum(sub[5]),
        status:          String(sub[6]),
        history:         safeParse(sub[7])
      }
    });
  } catch (error) {
    return jsonRes({ ok: false, error: "getSubscription: " + error.toString() });
  }
}

function saveSubscription(ss, data) {
  try {
    if (!data || !data.user) return jsonRes({ ok: false, error: "Invalid subscription data" });

    const sheet = getOrCreateSheet(ss, SUBSCRIPTION_SHEET, SUB_HEADERS);
    const user  = String(data.user).trim();

    // Find existing row for this user
    let rowIndex = -1;
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const userCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (let i = 0; i < userCol.length; i++) {
        if (String(userCol[i][0]).trim() === user) {
          rowIndex = i + 2;
          break;
        }
      }
    }

    const activatedDate = data.activatedDate ? new Date(data.activatedDate) : new Date();
    const expiryDate    = data.expiryDate
      ? new Date(data.expiryDate)
      : new Date(activatedDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const rowData = [
      data.id || ("SUB-" + Date.now()),
      user,
      activatedDate,
      expiryDate,
      data.lastRenewalDate ? new Date(data.lastRenewalDate) : new Date(),
      toNum(data.price),
      data.status || "active",
      JSON.stringify(data.history || [])
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, 8).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return jsonRes({ ok: true });
  } catch (error) {
    return jsonRes({ ok: false, error: "saveSubscription: " + error.toString() });
  }
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Returns a JSON ContentService response.
 * Falls back gracefully when run from the Apps Script editor
 * (ContentService is only available during web app execution).
 */
function jsonRes(obj) {
  const json = JSON.stringify(obj);
  if (typeof ContentService !== "undefined") {
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }
  // Editor fallback — allows testDoPost() to log the result
  return { getContent: function() { return json; } };
}

function safeParse(str) {
  try { return str ? JSON.parse(str) : {}; } catch (_) { return {}; }
}

function toNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function formatDate(d) {
  if (!d) return "";
  try {
    const date = new Date(d);
    if (!isValidDate(date)) return String(d);
    const day    = String(date.getDate()).padStart(2, "0");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return day + "-" + months[date.getMonth()] + "-" + date.getFullYear();
  } catch (_) {
    return String(d || "");
  }
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}

