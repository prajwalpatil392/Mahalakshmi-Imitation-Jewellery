// SIMPLE & ROBUST CONFIGURATION FOR STANDALONE SCRIPT

const SECRET_KEY = "ML_RENTALS_2024";

const MAIN_SHEET = "Sheet1";
const SPREADSHEET_ID = "1H728QUmyN87qv7C6T5dQtOPrCO77ZXCFcLzXaPrinx8";

// RECYCLE BIN
const RECYCLE_SPREADSHEET_ID = "1kCbI273iEfV1-s07-THXtN9Q47Kxaz_1oLSiSVtyd_4";
const RECYCLE_SHEET = "RecycleBin";

// HEADERS
const MAIN_HEADERS = [
  "ID",
  "Name",
  "Phone",
  "Address",
  "Receipt#",
  "Item",
  "Total",
  "Advance",
  "Balance",
  "Deposit",
  "From",
  "To",
  "Note",
  "photoUrls",
  "Status",
  "RetDate",
  "User"
];
const RECYCLE_HEADERS = MAIN_HEADERS.concat(["DeletedAt", "DeletedForeverAt", "BinStatus"]);

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const key = e.parameter.key;

    if (key !== SECRET_KEY) {
      return jsonRes({
        ok: false,
        error: "Unauthorized"
      });
    }

    const action = e.parameter.action;

    const sheetIdParam = String(e.parameter.sheetId || "").trim();
    const activeSpreadsheetId = sheetIdParam || SPREADSHEET_ID;

    let ss;

    try {
      ss = SpreadsheetApp.openById(activeSpreadsheetId);
    } catch (err) {
      return jsonRes({
        ok: false,
        error: "Cannot access spreadsheet: " + err.toString()
      });
    }

    const isRecycleSheetTarget = activeSpreadsheetId === RECYCLE_SPREADSHEET_ID;
    const targetSheetName = isRecycleSheetTarget ? RECYCLE_SHEET : MAIN_SHEET;
    const targetHeaders = isRecycleSheetTarget ? RECYCLE_HEADERS : MAIN_HEADERS;

    let sheet = ss.getSheetByName(targetSheetName);

    if (!sheet) {
      sheet = ss.insertSheet(targetSheetName);
      sheet.appendRow(targetHeaders);
    } else if (isRecycleSheetTarget) {
      ensureRecycleHeaders(sheet);
    }

    // ACTIONS

    if (action === "get") {
      return getRentals(sheet);
    }

    if (action === "add") {
      return addRental(sheet, safeParse(e.parameter.data));
    }

    if (action === "edit") {
      return editRental(sheet, safeParse(e.parameter.data));
    }

    if (action === "return") {
      return updateStatus(sheet, e.parameter.id, "returned");
    }

    if (action === "updatePhoto") {
      return updatePhoto(sheet, safeParse(e.parameter.data));
    }

    if (action === "delete") {
      if (isRecycleSheetTarget) {
        return markDeletedForever(sheet, e.parameter.id);
      }
      return archiveRecord(sheet, e.parameter.id);
    }

    return jsonRes({
      ok: false,
      error: "Unknown action"
    });
  } catch (error) {
    return jsonRes({
      ok: false,
      error: error.toString()
    });
  }
}

// =====================================================
// GET RENTALS
// =====================================================

function getRentals(sheet) {
  try {
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return jsonRes({
        ok: true,
        data: []
      });
    }

    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colCount = Math.max(MAIN_HEADERS.length, headerRow.length || MAIN_HEADERS.length);
    const headerMap = getHeaderIndexMap(sheet);
    const isRecycleSheet = Boolean(headerMap.BinStatus || headerMap.DeletedAt);
    const rows = sheet
      .getRange(2, 1, lastRow - 1, colCount)
      .getValues();

    const rentals = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    rows.forEach(r => {
      if (!r[0]) return;

      let status = String(r[14] || "active");
      const deletedAtCol = (headerMap.DeletedAt || 18) - 1;
      const deletedForeverAtCol = (headerMap.DeletedForeverAt || 19) - 1;
      const binStatusCol = (headerMap.BinStatus || 20) - 1;
      const deletedAt = r[deletedAtCol] ? formatDateTime(r[deletedAtCol]) : "";
      const deletedForeverAt = r[deletedForeverAtCol] ? formatDateTime(r[deletedForeverAtCol]) : "";
      const binStatus = String(r[binStatusCol] || "");

      // Keep recycle-bin rows as deleted state; don't auto-mark as overdue.
      if (isRecycleSheet && binStatus) {
        status = binStatus;
      } else try {
        const toDate = new Date(r[11]);

        if (isValidDate(toDate) && status !== "returned" && toDate < today) {
          status = "overdue";
        }
      } catch (e) {}

      rentals.push({
        id: String(r[0] || ""),
        name: String(r[1] || ""),
        phone: String(r[2] || ""),
        address: String(r[3] || ""),
        receiptNo: String(r[4] || ""),
        jewel: String(r[5] || ""),
        total: toNum(r[6]),
        advance: toNum(r[7]),
        balance: toNum(r[8]),
        deposit: toNum(r[9]),
        from: formatDate(r[10]),
        to: formatDate(r[11]),
        note: String(r[12] || ""),
        photoUrls: String(r[13] || ""),
        status: status,
        deleted: isRecycleSheet ? (binStatus === "deleted_forever" ? false : true) : false,
        user: String(r[16] || "System"),
        deletedAt: deletedAt,
        deletedForeverAt: deletedForeverAt,
        binStatus: binStatus
      });
    });

    return jsonRes({
      ok: true,
      data: rentals.reverse()
    });
  } catch (error) {
    return jsonRes({
      ok: false,
      error: error.toString()
    });
  }
}

// =====================================================
// ADD RENTAL
// =====================================================

function addRental(sheet, data) {
  try {
    const id = String(data.id || "").trim() || "R-" + new Date().getTime();

    const total = toNum(data.total);
    const advance = toNum(data.advance);

    sheet.appendRow([
      id,
      String(data.name || ""),
      String(data.phone || ""),
      String(data.address || ""),
      String(data.receiptNo || ""),
      String(data.jewel || ""),
      total,
      advance,
      total - advance,
      toNum(data.deposit),
      String(data.from || ""),
      String(data.to || ""),
      String(data.note || ""),
      String(data.photoUrls || ""),
      "active",
      "",
      String(data.user || "System")
    ]);

    return jsonRes({
      ok: true,
      id: id
    });
  } catch (error) {
    return jsonRes({
      ok: false,
      error: error.toString()
    });
  }
}

// =====================================================
// EDIT RENTAL
// =====================================================

function editRental(sheet, data) {
  try {
    const id = String(data.id || "").trim();

    const foundCell = findIdCell(sheet, id);

    if (!foundCell) {
      return jsonRes({
        ok: false,
        error: "Record not found"
      });
    }

    const row = foundCell.getRow();

    const total = toNum(data.total);
    const advance = toNum(data.advance);

    sheet.getRange(row, 2).setValue(String(data.name || ""));
    sheet.getRange(row, 3).setValue(String(data.phone || ""));
    sheet.getRange(row, 4).setValue(String(data.address || ""));
    sheet.getRange(row, 5).setValue(String(data.receiptNo || ""));
    sheet.getRange(row, 6).setValue(String(data.jewel || ""));
    sheet.getRange(row, 7).setValue(total);
    sheet.getRange(row, 8).setValue(advance);
    sheet.getRange(row, 9).setValue(total - advance);
    sheet.getRange(row, 10).setValue(toNum(data.deposit));
    sheet.getRange(row, 11).setValue(String(data.from || ""));
    sheet.getRange(row, 12).setValue(String(data.to || ""));
    sheet.getRange(row, 13).setValue(String(data.note || ""));
    sheet.getRange(row, 14).setValue(String(data.photoUrls || ""));
    sheet.getRange(row, 17).setValue(String(data.user || "System"));

    return jsonRes({
      ok: true
    });
  } catch (error) {
    return jsonRes({
      ok: false,
      error: error.toString()
    });
  }
}

// =====================================================
// UPDATE STATUS
// =====================================================

function updateStatus(sheet, id, status) {
  try {
    const foundCell = findIdCell(sheet, id);

    if (!foundCell) {
      return jsonRes({
        ok: false,
        error: "Record not found"
      });
    }

    const row = foundCell.getRow();

    sheet.getRange(row, 15).setValue(status);
    sheet.getRange(row, 16).setValue(new Date());

    return jsonRes({
      ok: true
    });
  } catch (error) {
    return jsonRes({
      ok: false,
      error: error.toString()
    });
  }
}

// =====================================================
// UPDATE PHOTO
// =====================================================

function updatePhoto(sheet, data) {
  try {
    const foundCell = findIdCell(sheet, data.id);

    if (!foundCell) {
      return jsonRes({
        ok: false,
        error: "Record not found"
      });
    }

    const row = foundCell.getRow();

    sheet.getRange(row, 14).setValue(String(data.url || ""));

    return jsonRes({
      ok: true
    });
  } catch (error) {
    return jsonRes({
      ok: false,
      error: error.toString()
    });
  }
}

// =====================================================
// DELETE -> RECYCLE BIN
// =====================================================

function archiveRecord(sheet, id) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    Logger.log("[archiveRecord] start id=%s", id);

    const foundCell = findIdCell(sheet, id);

    if (!foundCell) {
      Logger.log("[archiveRecord] record not found id=%s", id);
      return jsonRes({
        ok: false,
        error: "Record not found"
      });
    }

    const rowIndex = foundCell.getRow();

    const rowData = sheet.getRange(rowIndex, 1, 1, MAIN_HEADERS.length).getValues()[0];

    // OPEN RECYCLE BIN SPREADSHEET
    const recycleSS = SpreadsheetApp.openById(RECYCLE_SPREADSHEET_ID);
    let recycleSheet = recycleSS.getSheetByName(RECYCLE_SHEET);
    Logger.log("[archiveRecord] recycle open ok sheet=%s", RECYCLE_SHEET);

    // CREATE SHEET IF MISSING
    if (!recycleSheet) {
      recycleSheet = recycleSS.insertSheet(RECYCLE_SHEET);
    }

    ensureRecycleHeaders(recycleSheet);

    // ADD DELETE DATE + EMPTY FOREVER DATE + STATUS
    rowData.push(new Date());
    rowData.push("");
    rowData.push("in_bin");

    // SAVE INTO RECYCLE BIN (must succeed before main delete)
    try {
      recycleSheet.appendRow(rowData);
      SpreadsheetApp.flush();
      Logger.log("[archiveRecord] recycle append success id=%s", id);
    } catch (reErr) {
      Logger.log("[archiveRecord] recycle append failed id=%s err=%s", id, reErr);
      return jsonRes({
        ok: false,
        error: "Recycle append failed: " + reErr.toString()
      });
    }

    // DELETE FROM MAIN SHEET
    sheet.deleteRow(rowIndex);
    Logger.log("[archiveRecord] main delete success id=%s row=%s", id, rowIndex);

    return jsonRes({
      ok: true
    });
  } catch (error) {
    Logger.log("[archiveRecord] failed id=%s err=%s", id, error);
    return jsonRes({
      ok: false,
      error: error.toString()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function markDeletedForever(sheet, id) {
  try {
    ensureRecycleHeaders(sheet);

    const foundCell = findIdCell(sheet, id);
    if (!foundCell) {
      return jsonRes({
        ok: false,
        error: "Record not found"
      });
    }

    const row = foundCell.getRow();
    const headerMap = getHeaderIndexMap(sheet);
    const statusCol = headerMap.BinStatus || 20;
    const foreverCol = headerMap.DeletedForeverAt || 19;

    sheet.getRange(row, foreverCol).setValue(new Date());
    sheet.getRange(row, statusCol).setValue("deleted_forever");

    return jsonRes({
      ok: true
    });
  } catch (error) {
    return jsonRes({
      ok: false,
      error: error.toString()
    });
  }
}

// =====================================================
// TEST RECYCLE ACCESS
// RUN THIS MANUALLY ONCE
// =====================================================

function testRecycleAccess() {
  const recycleSS = SpreadsheetApp.openById(RECYCLE_SPREADSHEET_ID);
  let recycleSheet = recycleSS.getSheetByName(RECYCLE_SHEET);

  if (!recycleSheet) {
    recycleSheet = recycleSS.insertSheet(RECYCLE_SHEET);
  }

  recycleSheet.appendRow(["TEST", new Date()]);
}

// =====================================================
// HELPERS
// =====================================================

function findIdCell(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  return sheet
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(String(id).trim())
    .matchEntireCell(true)
    .findNext();
}

function ensureRecycleHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(RECYCLE_HEADERS);
    return;
  }

  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h || "").trim());
  const missingHeaders = RECYCLE_HEADERS.filter(h => !existingHeaders.includes(h));
  if (!missingHeaders.length) return;

  const startCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
}

// =====================================================
// UTILITIES
// =====================================================

function jsonRes(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function safeParse(str) {
  try {
    return str ? JSON.parse(str) : {};
  } catch (e) {
    return {};
  }
}

function toNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function formatDate(d) {
  if (!d) return "";

  try {
    const date = new Date(d);
    if (!isValidDate(date)) {
      return String(d);
    }

    return Utilities.formatDate(date, "GMT+5:30", "yyyy-MM-dd");
  } catch (e) {
    return String(d || "");
  }
}

function formatDateTime(d) {
  if (!d) return "";
  try {
    const date = new Date(d);
    if (!isValidDate(date)) return String(d || "");
    return Utilities.formatDate(date, "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
  } catch (e) {
    return String(d || "");
  }
}

function getHeaderIndexMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    const key = String(h || "").trim();
    if (key) map[key] = i + 1;
  });
  return map;
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}
