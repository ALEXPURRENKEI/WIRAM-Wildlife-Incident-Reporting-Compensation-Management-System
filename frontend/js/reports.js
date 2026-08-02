(function () {
  "use strict";

  const MAX_IMAGE_DIMENSION = 1600;
  const COMPRESSED_IMAGE_TYPE = "image/jpeg";
  const COMPRESSED_IMAGE_QUALITY = 0.82;
  const MAX_LOCAL_EVIDENCE_LENGTH = 350000;
  function readAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function (event) {
        resolve(event.target.result || "");
      };
      reader.onerror = function () {
        reject(new Error("Unable to preview the selected image."));
      };
      reader.readAsDataURL(file);
    });
  }

  function loadImageElement(file) {
    return new Promise(function (resolve, reject) {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read the selected image."));
      };

      image.src = objectUrl;
    });
  }

  async function buildEvidenceData(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) {
      return "";
    }

    const image = await loadImageElement(file);
    const largestSide = Math.max(image.width, image.height);
    const ratio = largestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestSide : 1;
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return readAsDataUrl(file);
    }

    context.drawImage(image, 0, 0, width, height);

      const compressed = canvas.toDataURL(COMPRESSED_IMAGE_TYPE, COMPRESSED_IMAGE_QUALITY);
    const original = await readAsDataUrl(file);
    return compressed.length < original.length ? compressed : original;
  }

  function isStorageQuotaError(error) {
    if (!error) {
      return false;
    }

    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      /quota/i.test(String(error.message || ""))
    );
  }

  function saveLocalReport(report, reports) {
    try {
      window.WIRAM.setReports(reports);
      return false;
    } catch (storageError) {
      if (!report.evidenceData || !isStorageQuotaError(storageError)) {
        throw storageError;
      }

      report.evidenceData = "";
      window.WIRAM.setReports(reports);
      return true;
    }
  }

  function normalizeStatus(status) {
    return String(status || "").toLowerCase().trim();
  }

  function filterReports(status, reportsList) {
    const normalized = normalizeStatus(status);
    if (!normalized || normalized === "all") {
      return reportsList.slice();
    }

    return reportsList.filter(function (report) {
      return normalizeStatus(report.status) === normalized;
    });
  }

  function statusBadge(status) {
    const normalized = normalizeStatus(status);
    const label = normalized || "unknown";
    return (
      '<span class="badge badge-' +
      window.WIRAM.escapeHtml(label) +
      '">' +
      window.WIRAM.escapeHtml(label) +
      "</span>"
    );
  }

  function paymentDisplay(report) {
    const detail = window.WIRAM.formatPaymentDetails(report.paymentMode, report);
    const mode = window.WIRAM.escapeHtml(window.WIRAM.formatPaymentMode(report.paymentMode));
    if (!detail) {
      return mode;
    }
    return mode + '<div class="muted table-note">' + window.WIRAM.escapeHtml(detail) + '</div>';
  }

  function reportActions(report, actionContext) {
    let actions =
      '<button class="btn btn-secondary btn-sm" data-action="view" data-report-id="' +
      window.WIRAM.escapeHtml(report.id) +
      '">View</button>';

    if (actionContext === "officer" && normalizeStatus(report.status) === "pending") {
      actions +=
        '<button class="btn btn-primary btn-sm" data-action="status" data-next-status="verified" data-report-id="' +
        window.WIRAM.escapeHtml(report.id) +
        '">Verify</button>' +
        '<button class="btn btn-danger btn-sm" data-action="status" data-next-status="rejected" data-report-id="' +
        window.WIRAM.escapeHtml(report.id) +
        '">Reject</button>';
    }

    if (actionContext === "admin") {
      if (normalizeStatus(report.status) !== "paid") {
        actions +=
          '<button class="btn btn-primary btn-sm" data-action="status" data-next-status="paid" data-report-id="' +
          window.WIRAM.escapeHtml(report.id) +
          '">Mark Paid</button>';
      }

      if (normalizeStatus(report.status) === "pending") {
        actions +=
          '<button class="btn btn-warning btn-sm" data-action="status" data-next-status="verified" data-report-id="' +
          window.WIRAM.escapeHtml(report.id) +
          '">Set Verified</button>' +
          '<button class="btn btn-danger btn-sm" data-action="status" data-next-status="rejected" data-report-id="' +
          window.WIRAM.escapeHtml(report.id) +
          '">Set Rejected</button>';
      }
    }

    return '<div class="table-actions">' + actions + "</div>";
  }

  function displayReports(options) {
    const config = options || {};
    const tableBodyId = config.tableBodyId || "reportsTableBody";
    const includeReporter = Boolean(config.includeReporter);
    const actionContext = config.actionContext || "member";
    const emptyMessage = config.emptyMessage || "No reports found.";
    const reports = Array.isArray(config.data) ? config.data : [];

    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) {
      return;
    }

    if (!reports.length) {
      const columns = includeReporter ? 10 : 9;
      tableBody.innerHTML =
        '<tr><td colspan="' +
        columns +
        '" class="table-empty">' +
        window.WIRAM.escapeHtml(emptyMessage) +
        "</td></tr>";
      bindTableActions(tableBody);
      return;
    }

    tableBody.innerHTML = reports
      .map(function (report) {
        return (
          "<tr>" +
          "<td>" +
          window.WIRAM.escapeHtml(report.id) +
          "</td>" +
          (includeReporter ? "<td>" + window.WIRAM.escapeHtml(report.reporterName || "-") + "</td>" : "") +
          "<td>" +
          window.WIRAM.escapeHtml(report.animalType || "-") +
          "</td>" +
          "<td>" +
          window.WIRAM.escapeHtml(report.incidentType || "-") +
          "</td>" +
          "<td>" +
          window.WIRAM.escapeHtml(report.location || "-") +
          "</td>" +
          "<td>" +
          window.WIRAM.formatCurrency(report.estimatedLoss) +
          "</td>" +
          "<td>" +
          paymentDisplay(report) +
          "</td>" +
          "<td>" +
          statusBadge(report.status) +
          "</td>" +
          "<td>" +
          window.WIRAM.formatDate(report.createdAt) +
          "</td>" +
          "<td>" +
          reportActions(report, actionContext) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    bindTableActions(tableBody);
  }

  async function updateStatus(reportId, status, notes) {
    const normalized = normalizeStatus(status);
    const valid = ["pending", "verified", "rejected", "paid"];
    if (valid.indexOf(normalized) === -1) {
      window.WIRAM.showAlert("Invalid status selected.", "error");
      return false;
    }

    const statusNotes = String(notes || "").trim();

    const localReports = window.WIRAM.getReports();
    const localReport = localReports.find(function (item) {
      return item.id === reportId;
    });

    if (!localReport && window.WIRAM.shouldUseLocalData && window.WIRAM.shouldUseLocalData()) {
      window.WIRAM.showAlert("Report was not found.", "error");
      return false;
    }

    window.WIRAM.showSpinner();
    try {
      if (window.WIRAM.isApiConfigured()) {
        try {
          await window.WIRAM.updateRemoteReportStatus(reportId, normalized, statusNotes);
        } catch (error) {
          if (!window.WIRAM.isApiNetworkError || !window.WIRAM.isApiNetworkError(error) || !localReport || !window.WIRAM.shouldUseLocalData || !window.WIRAM.shouldUseLocalData()) {
            throw error;
          }
        }
      }
      if (!window.WIRAM.isApiConfigured() && (!window.WIRAM.shouldUseLocalData || !window.WIRAM.shouldUseLocalData())) {
        throw new Error("Backend is offline. Start the backend before updating reports.");
      }

      if (window.WIRAM.shouldUseLocalData && window.WIRAM.shouldUseLocalData() && localReport) {
        localReport.status = normalized;
        localReport.updatedAt = new Date().toISOString();
        const currentUser = window.WIRAM.getCurrentUser();
        if (currentUser) {
          localReport.reviewedBy = currentUser.name;
          localReport.reviewedByName = currentUser.name;
        }
        if (statusNotes) {
          if (!Array.isArray(localReport.history)) {
            localReport.history = [];
          }
          localReport.history.unshift({
            id: window.WIRAM.createId("HIS"),
            reportId: reportId,
            status: normalized,
            notes: statusNotes,
            changedBy: currentUser ? currentUser.id : "",
            changedByName: currentUser ? currentUser.name : "System",
            changedAt: localReport.updatedAt
          });
        }
        window.WIRAM.setReports(localReports);
      }

      window.WIRAM.showAlert(
        "Report " + reportId + " updated to " + normalized + ".",
        "success"
      );
      await refreshReportViews();
      return true;
    } catch (error) {
      window.WIRAM.showAlert(error.message || "Unable to update the report.", "error");
      return false;
    } finally {
      window.WIRAM.hideSpinner();
    }
  }

  async function updatePaymentMode(reportId, paymentMode) {
    const normalized = window.WIRAM.normalizePaymentMode(paymentMode);
    if (!normalized) {
      window.WIRAM.showAlert("Please select a payment mode.", "error");
      return false;
    }

    const localReports = window.WIRAM.getReports();
    const localReport = localReports.find(function (item) {
      return item.id === reportId;
    });

    if (!localReport && window.WIRAM.shouldUseLocalData && window.WIRAM.shouldUseLocalData()) {
      window.WIRAM.showAlert("Report was not found.", "error");
      return false;
    }

    window.WIRAM.showSpinner();
    try {
      if (window.WIRAM.isApiConfigured()) {
        try {
          await window.WIRAM.updateRemoteReportPaymentMode(reportId, normalized, localReport || {});
        } catch (error) {
          if (!window.WIRAM.isApiNetworkError || !window.WIRAM.isApiNetworkError(error) || !localReport || !window.WIRAM.shouldUseLocalData || !window.WIRAM.shouldUseLocalData()) {
            throw error;
          }
        }
      }
      if (!window.WIRAM.isApiConfigured() && (!window.WIRAM.shouldUseLocalData || !window.WIRAM.shouldUseLocalData())) {
        throw new Error("Backend is offline. Start the backend before updating payment mode.");
      }

      if (window.WIRAM.shouldUseLocalData && window.WIRAM.shouldUseLocalData() && localReport) {
        localReport.paymentMode = normalized;
        localReport.updatedAt = new Date().toISOString();
        window.WIRAM.setReports(localReports);
      }

      window.WIRAM.showAlert("Payment mode updated.", "success");
      await refreshReportViews();
      return true;
    } catch (error) {
      window.WIRAM.showAlert(error.message || "Unable to update payment mode.", "error");
      return false;
    } finally {
      window.WIRAM.hideSpinner();
    }
  }

  function bindModalPaymentModeForm(report) {
    const form = document.getElementById("modalPaymentModeForm");
    const select = document.getElementById("modalPaymentMode");
    if (!form || !select || form.dataset.bound) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      updatePaymentMode(report.id, select.value).then(function (updated) {
        if (updated) {
          void openReportModal(report.id);
        }
      });
    });

    form.dataset.bound = "true";
  }

  async function openReportModal(reportId) {
    let report = null;
    try {
      if (window.WIRAM.isApiConfigured()) {
        report = await window.WIRAM.loadReportDetail(reportId);
      } else {
        report = window.WIRAM.getReports().find(function (item) {
          return item.id === reportId;
        });
      }
    } catch (error) {
      window.WIRAM.showAlert(error.message || "Unable to load report details.", "error");
      return;
    }

    if (!report) {
      return;
    }

    const modalBody = document.getElementById("reportModalBody");
    if (!modalBody) {
      return;
    }

    const imageHtml =
      report.evidenceData && /^data:image\//.test(report.evidenceData)
        ? '<img class="upload-preview" src="' +
          window.WIRAM.escapeHtml(report.evidenceData) +
          '" alt="Evidence Preview" />'
        : report.evidenceData
        ? '<a class="btn btn-secondary btn-sm" href="' +
          window.WIRAM.escapeHtml(report.evidenceData) +
          '" target="_blank" rel="noreferrer">Open Evidence</a>'
        : "<p class='muted'>No image preview available.</p>";

    const history = Array.isArray(report.history) ? report.history : [];
    const currentUser = window.WIRAM.getCurrentUser();
    const canEditPaymentMode =
      currentUser &&
      window.WIRAM.normalizeRole(currentUser.role) === "member" &&
      (!report.reporterId || report.reporterId === currentUser.id) &&
      normalizeStatus(report.status) !== "paid";
    const paymentModeControl = canEditPaymentMode
      ? '<form id="modalPaymentModeForm" class="inline-form" style="margin-top: 0.75rem;" novalidate>' +
        '<select id="modalPaymentMode" name="paymentMode" required>' +
        '<option value="">Select payment mode</option>' +
        '<option value="MPESA"' +
        (window.WIRAM.normalizePaymentMode(report.paymentMode) === "MPESA" ? " selected" : "") +
        ">M-Pesa</option>" +
        '<option value="BANK_TRANSFER"' +
        (window.WIRAM.normalizePaymentMode(report.paymentMode) === "BANK_TRANSFER" ? " selected" : "") +
        ">Bank Transfer</option>" +
        '<option value="CASH"' +
        (window.WIRAM.normalizePaymentMode(report.paymentMode) === "CASH" ? " selected" : "") +
        ">Cash</option>" +
        '<option value="CHEQUE"' +
        (window.WIRAM.normalizePaymentMode(report.paymentMode) === "CHEQUE" ? " selected" : "") +
        ">Cheque</option>" +
        "</select>" +
        '<button class="btn btn-primary btn-sm" type="submit">Save</button>' +
        "</form>"
      : "";
    const historyMarkup =
      history.length > 0
        ? '<div class="history-list">' +
          history
            .map(function (item) {
              return (
                '<div class="detail-item">' +
                "<strong>" +
                window.WIRAM.escapeHtml(item.status || "-") +
                "</strong>" +
                '<div class="muted">' +
                window.WIRAM.escapeHtml(item.notes || "Status updated.") +
                "</div>" +
                '<div class="muted" style="margin-top: 0.25rem;">' +
                window.WIRAM.escapeHtml(item.changedByName || "System") +
                " · " +
                window.WIRAM.formatDate(item.changedAt) +
                "</div>" +
                "</div>"
              );
            })
            .join("") +
          "</div>"
        : "<p class='muted'>No status history yet.</p>";

    modalBody.innerHTML =
      '<div class="modal-body-grid">' +
      '<div class="detail-item"><strong>Report ID</strong>' +
      window.WIRAM.escapeHtml(report.id) +
      "</div>" +
      '<div class="detail-item"><strong>Reporter</strong>' +
      window.WIRAM.escapeHtml(report.reporterName || "-") +
      "</div>" +
      '<div class="detail-item"><strong>Animal Type</strong>' +
      window.WIRAM.escapeHtml(report.animalType || "-") +
      "</div>" +
      '<div class="detail-item"><strong>Incident Type</strong>' +
      window.WIRAM.escapeHtml(report.incidentType || "-") +
      "</div>" +
      '<div class="detail-item"><strong>Location</strong>' +
      window.WIRAM.escapeHtml(report.location || "-") +
      "</div>" +
      '<div class="detail-item"><strong>Estimated Loss</strong>' +
      window.WIRAM.formatCurrency(report.estimatedLoss) +
      "</div>" +
      '<div class="detail-item"><strong>Status</strong>' +
      statusBadge(report.status) +
      "</div>" +
      '<div class="detail-item"><strong>Payment Mode</strong>' +
      window.WIRAM.escapeHtml(window.WIRAM.formatPaymentMode(report.paymentMode)) +
      paymentModeControl +
      "</div>" +
      '<div class="detail-item"><strong>Compensation Recipient</strong>' +
      window.WIRAM.escapeHtml(window.WIRAM.formatPaymentDetails(report.paymentMode, report) || "Not provided") +
      "</div>" +
      '<div class="detail-item"><strong>Submitted</strong>' +
      window.WIRAM.formatDate(report.createdAt) +
      "</div>" +
      '<div class="detail-item"><strong>Last Updated</strong>' +
      window.WIRAM.formatDate(report.updatedAt) +
      "</div>" +
      '<div class="detail-item"><strong>Reviewed By</strong>' +
      window.WIRAM.escapeHtml(report.reviewedByName || "-") +
      "</div>" +
      '<div class="detail-item"><strong>Evidence File</strong>' +
      window.WIRAM.escapeHtml(report.evidenceName || "Not provided") +
      "</div>" +
      '<div class="detail-item" style="grid-column: 1 / -1;"><strong>Description</strong>' +
      window.WIRAM.escapeHtml(report.description || "No description available.") +
      "</div>" +
      '<div class="detail-item" style="grid-column: 1 / -1;"><strong>Evidence Preview</strong>' +
      imageHtml +
      "</div>" +
      '<div class="detail-item" style="grid-column: 1 / -1;"><strong>Status History</strong>' +
      historyMarkup +
      "</div>" +
      "</div>";

    bindModalPaymentModeForm(report);
    window.WIRAM.openModal("reportModal");
  }

  function bindTableActions(tableBody) {
    if (tableBody.dataset.bound) {
      return;
    }

    tableBody.addEventListener("click", function (event) {
      const actionButton = event.target.closest("button[data-action]");
      if (!actionButton) {
        return;
      }

      const action = actionButton.getAttribute("data-action");
      const reportId = actionButton.getAttribute("data-report-id");
      if (!reportId) {
        return;
      }

      if (action === "view") {
        void openReportModal(reportId);
        return;
      }

      if (action === "status") {
        const nextStatus = actionButton.getAttribute("data-next-status");
        void updateStatus(reportId, nextStatus);
      }
    });

    tableBody.dataset.bound = "true";
  }

  function bindImagePreview() {
    const imageInput = document.getElementById("reportImage");
    const preview = document.getElementById("imagePreview");
    if (!imageInput || !preview || imageInput.dataset.bound) {
      return;
    }

    imageInput.addEventListener("change", function () {
      const file = imageInput.files && imageInput.files[0];
      const previousObjectUrl = preview.dataset.objectUrl;
      if (previousObjectUrl) {
        URL.revokeObjectURL(previousObjectUrl);
        delete preview.dataset.objectUrl;
      }

      if (!file) {
        preview.src = "";
        preview.classList.add("hidden");
        return;
      }

      try {
        const objectUrl = URL.createObjectURL(file);
        preview.src = objectUrl;
        preview.dataset.objectUrl = objectUrl;
        preview.classList.remove("hidden");
      } catch (_error) {
        window.WIRAM.showAlert("Could not preview that image.", "error");
      }
    });

    imageInput.dataset.bound = "true";
  }

  async function submitReport(payload) {
    const form = document.getElementById("reportForm");
    const data = payload || (form ? new FormData(form) : null);
    if (!data) {
      return false;
    }

    const currentUser = window.WIRAM.getCurrentUser();
    if (!currentUser) {
      window.WIRAM.setFlashMessage("Please log in before submitting a report.", "error");
      window.location.href = "login.html";
      return false;
    }

    const animalType = String(data.get("animalType") || "").trim();
    const incidentType = String(data.get("incidentType") || "").trim();
    const location = String(data.get("location") || "").trim();
    const description = String(data.get("description") || "").trim();
    const estimatedLoss = Number(data.get("estimatedLoss") || 0);
    const paymentMode = window.WIRAM.normalizePaymentMode(data.get("paymentMode"));
    const imageFile = data.get("reportImage");

    if (!animalType || !incidentType || !location || !description || !paymentMode) {
      window.WIRAM.showAlert("Please complete all required incident fields.", "error");
      return false;
    }

    let paymentDetails;
    try {
      paymentDetails = window.WIRAM.validatePaymentDetails(paymentMode, {
        paymentPhone: data.get("paymentPhone"),
        paymentBankAccount: data.get("paymentBankAccount")
      });
    } catch (error) {
      window.WIRAM.showAlert(error.message, "error");
      return false;
    }

    if (!Number.isFinite(estimatedLoss) || estimatedLoss <= 0) {
      window.WIRAM.showAlert("Estimated loss must be greater than 0.", "error");
      return false;
    }

    let evidenceName = "";
    let evidenceData = "";
    let localImageSkipped = false;

    try {
      window.WIRAM.showSpinner();

      if (imageFile && imageFile.name) {
        evidenceName = imageFile.name;
        evidenceData = await buildEvidenceData(imageFile);
      }

      if (window.WIRAM.shouldUseLocalData && window.WIRAM.shouldUseLocalData() && evidenceData.length > MAX_LOCAL_EVIDENCE_LENGTH) {
        evidenceData = "";
        localImageSkipped = true;
      }

      let savedRemotely = false;
      if (window.WIRAM.isApiConfigured()) {
        try {
          await window.WIRAM.submitRemoteReport({
            animalType: animalType,
            incidentType: incidentType,
            location: location,
            description: description,
            estimatedLoss: estimatedLoss,
            paymentMode: paymentMode,
            paymentPhone: paymentDetails.paymentPhone,
            paymentBankAccount: paymentDetails.paymentBankAccount,
            evidenceName: evidenceName,
            evidenceData: evidenceData
          });
          savedRemotely = true;
          window.localStorage.removeItem("wiram_local_demo_mode");
        } catch (error) {
          if (!window.WIRAM.isApiNetworkError || !window.WIRAM.isApiNetworkError(error) || !window.WIRAM.shouldUseLocalData || !window.WIRAM.shouldUseLocalData()) {
            throw error;
          }
        }
      }
      if (!window.WIRAM.isApiConfigured() && (!window.WIRAM.shouldUseLocalData || !window.WIRAM.shouldUseLocalData())) {
        throw new Error("Backend is offline. Start the backend before submitting reports.");
      }

      if (!savedRemotely && window.WIRAM.shouldUseLocalData && window.WIRAM.shouldUseLocalData()) {
        const reports = window.WIRAM.getReports();
        const now = new Date().toISOString();
        const report = {
          id: window.WIRAM.createId("RPT"),
          animalType: animalType,
          incidentType: incidentType,
          location: location,
          description: description,
          estimatedLoss: estimatedLoss,
          evidenceName: evidenceName,
          evidenceData: evidenceData,
          paymentMode: paymentMode,
          paymentPhone: paymentDetails.paymentPhone,
          paymentBankAccount: paymentDetails.paymentBankAccount,
          status: "pending",
          reporterId: currentUser.id,
          reporterName: currentUser.name,
          createdAt: now,
          updatedAt: now
        };
        reports.unshift(report);
        localImageSkipped = saveLocalReport(report, reports) || localImageSkipped;
      }

      if (localImageSkipped) {
        window.WIRAM.showAlert(
          "Incident report submitted, but the image was too large for offline browser storage.",
          "success"
        );
      } else {
        window.WIRAM.showAlert("Incident report submitted successfully.", "success");
      }

      if (form) {
        form.reset();
      }

      const preview = document.getElementById("imagePreview");
      if (preview) {
        const previewObjectUrl = preview.dataset.objectUrl;
        if (previewObjectUrl) {
          URL.revokeObjectURL(previewObjectUrl);
          delete preview.dataset.objectUrl;
        }
        preview.src = "";
        preview.classList.add("hidden");
      }

      await refreshReportViews();
      return true;
    } catch (error) {
      window.WIRAM.showAlert(error.message || "Unable to submit report. Please try again.", "error");
      return false;
    } finally {
      window.WIRAM.hideSpinner();
    }
  }

  async function renderMyReports() {
    const table = document.getElementById("myReportsTableBody");
    if (!table) {
      return;
    }

    const filter = document.getElementById("myReportsFilter");
    const filterValue = filter ? filter.value : "all";
    let reports = [];

    try {
      reports = await window.WIRAM.loadReportsForCurrentUser();
    } catch (_error) {
      reports = window.WIRAM.getReports();
    }

    reports = reports.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    displayReports({
      tableBodyId: "myReportsTableBody",
      data: filterReports(filterValue, reports),
      includeReporter: false,
      actionContext: "member",
      emptyMessage: "You have not submitted incident reports yet."
    });
  }

  async function renderClaimStatus() {
    const table = document.getElementById("claimStatusTableBody");
    if (!table) {
      return;
    }

    const filter = document.getElementById("claimStatusFilter");
    const filterValue = filter ? filter.value : "all";
    let reports = [];

    try {
      reports = await window.WIRAM.loadReportsForCurrentUser();
    } catch (_error) {
      reports = window.WIRAM.getReports();
    }

    reports = reports.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    displayReports({
      tableBodyId: "claimStatusTableBody",
      data: filterReports(filterValue, reports),
      includeReporter: false,
      actionContext: "member",
      emptyMessage: "No claim statuses available yet."
    });

    window.WIRAM.populateSummaryCards(reports);
    window.WIRAM.renderStatusChart("claimChart", reports);
  }

  async function renderVerifyIncidents() {
    const table = document.getElementById("verifyTableBody");
    if (!table) {
      return;
    }

    const filter = document.getElementById("verifyFilter");
    const filterValue = filter ? filter.value : "all";
    let reports = [];

    try {
      reports = await window.WIRAM.loadReportsForCurrentUser();
    } catch (_error) {
      reports = window.WIRAM.getReports();
    }

    reports = reports.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    displayReports({
      tableBodyId: "verifyTableBody",
      data: filterReports(filterValue, reports),
      includeReporter: true,
      actionContext: "officer",
      emptyMessage: "No incidents available for verification."
    });
  }

  async function renderAdminReports() {
    const table = document.getElementById("adminReportsTableBody");
    if (!table) {
      return;
    }

    const filter = document.getElementById("adminReportsFilter");
    const filterValue = filter ? filter.value : "all";
    let reports = [];

    try {
      reports = await window.WIRAM.loadReportsForCurrentUser();
    } catch (_error) {
      reports = window.WIRAM.getReports();
    }

    reports = reports.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    displayReports({
      tableBodyId: "adminReportsTableBody",
      data: filterReports(filterValue, reports),
      includeReporter: true,
      actionContext: "admin",
      emptyMessage: "No incidents available."
    });
    renderIncidentPaymentOptions(reports);
  }

  function getSelectedPaymentReport(select) {
    const reports = select && Array.isArray(select.__paymentReports) ? select.__paymentReports : [];
    return reports.find(function (report) {
      return report.id === select.value;
    });
  }

  function paymentReportLabel(report) {
    return [
      report.id,
      report.reporterName || "Community member",
      report.location || "Unknown location",
      window.WIRAM.formatCurrency(report.estimatedLoss)
    ].join(" - ");
  }

  function updatePaymentReportSummary(report) {
    const summary = document.getElementById("paymentReportSummary");
    if (!summary) {
      return;
    }

    if (!report) {
      summary.textContent = "Select a verified incident to review the payment details.";
      return;
    }

    summary.textContent =
      "Ready to pay " +
      window.WIRAM.formatCurrency(report.estimatedLoss) +
      " to " +
      (report.reporterName || "the community member") +
      " using " +
      window.WIRAM.formatPaymentMode(report.paymentMode) +
      (window.WIRAM.formatPaymentDetails(report.paymentMode, report)
        ? " (" + window.WIRAM.formatPaymentDetails(report.paymentMode, report) + ")"
        : "") +
      ".";
  }

  function renderIncidentPaymentOptions(reports) {
    const select = document.getElementById("paymentReport");
    const amount = document.getElementById("paymentAmount");
    const modeSelect = document.getElementById("paymentModeUsed");
    if (!select) {
      return;
    }

    const previousValue = select.value;
    const payableReports = reports.filter(function (report) {
      return normalizeStatus(report.status) === "verified";
    });
    select.__paymentReports = payableReports;

    if (!payableReports.length) {
      select.innerHTML = '<option value="">No verified incidents awaiting payment</option>';
      select.disabled = true;
      if (amount) {
        amount.value = "";
      }
      if (modeSelect) {
        modeSelect.value = "";
      }
      updatePaymentReportSummary(null);
      return;
    }

    select.disabled = false;
    select.innerHTML =
      '<option value="">Select verified incident</option>' +
      payableReports
        .map(function (report) {
          return (
            '<option value="' +
            window.WIRAM.escapeHtml(report.id) +
            '">' +
            window.WIRAM.escapeHtml(paymentReportLabel(report)) +
            "</option>"
          );
        })
        .join("");

    if (payableReports.some(function (report) { return report.id === previousValue; })) {
      select.value = previousValue;
    }

    const selectedReport = getSelectedPaymentReport(select);
    if (selectedReport && amount && !amount.value) {
      amount.value = String(Number(selectedReport.estimatedLoss) || 0);
    }
    if (modeSelect) {
      modeSelect.value = selectedReport ? window.WIRAM.normalizePaymentMode(selectedReport.paymentMode) : "";
    }
    updatePaymentReportSummary(selectedReport);
  }

  function bindIncidentPaymentForm() {
    const form = document.getElementById("incidentPaymentForm");
    const partnerSelect = document.getElementById("paymentPartner");
    const reportSelect = document.getElementById("paymentReport");
    const amountInput = document.getElementById("paymentAmount");
    const modeSelect = document.getElementById("paymentModeUsed");
    const payerPhoneInput = document.getElementById("payerPhone");
    if (!form || !partnerSelect || !reportSelect || !amountInput || !modeSelect || !payerPhoneInput || form.dataset.bound) {
      return;
    }

    reportSelect.addEventListener("change", function () {
      const report = getSelectedPaymentReport(reportSelect);
      amountInput.value = report ? String(Number(report.estimatedLoss) || 0) : "";
      modeSelect.value = report ? window.WIRAM.normalizePaymentMode(report.paymentMode) : "";
      updatePaymentReportSummary(report);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const partner = String(partnerSelect.value || "").trim();
      const report = getSelectedPaymentReport(reportSelect);
      const amount = Number(amountInput.value || 0);
      const paymentMode = window.WIRAM.normalizePaymentMode(modeSelect.value);
      const memberPaymentMode = window.WIRAM.normalizePaymentMode(report && report.paymentMode);
      const payerPhone = window.WIRAM.normalizeMpesaPhoneNumber(payerPhoneInput.value);

      if (!partner) {
        window.WIRAM.showAlert("Please select KWS or Enkaretoni CBO.", "error");
        return;
      }

      if (!report) {
        window.WIRAM.showAlert("Please select a verified incident to pay.", "error");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        window.WIRAM.showAlert("Payment amount must be greater than 0.", "error");
        return;
      }

      if (!paymentMode) {
        window.WIRAM.showAlert("Please select the community member's payment mode.", "error");
        return;
      }

      if (!payerPhone) {
        window.WIRAM.showAlert("Please enter the KWS or Enkaretoni phone number making the compensation.", "error");
        return;
      }

      if (memberPaymentMode && paymentMode !== memberPaymentMode) {
        window.WIRAM.showAlert("Use the payment mode selected by the community member.", "error");
        return;
      }

      const promptMessage =
        "Enter M-Pesa PIN for " + payerPhone + " to pay " + window.WIRAM.formatCurrency(amount) + ".";
      const summary = document.getElementById("paymentReportSummary");
      if (summary) {
        summary.textContent = promptMessage;
      }

      window.WIRAM.showSpinner();
      void window.WIRAM
        .initiateMpesaPayment({
          phoneNumber: payerPhone,
          amount: Math.round(amount),
          partnerName: partner,
          reference: report.id
        })
        .then(function (response) {
          const responseMessage = response && response.message ? response.message : promptMessage;
          const message = response && response.status === "failed" ? responseMessage : promptMessage + " " + responseMessage;
          if (summary) {
            summary.textContent = message;
          }
          if (response && response.status === "failed") {
            window.WIRAM.showAlert(responseMessage, "error");
            return false;
          }

          window.WIRAM.showAlert(promptMessage, "success");
          const notes =
            "Payment made by " +
            partner +
            " for " +
            window.WIRAM.formatCurrency(amount) +
            " via " +
            window.WIRAM.formatPaymentMode(paymentMode) +
            " from " +
            payerPhone +
            (window.WIRAM.formatPaymentDetails(report.paymentMode, report)
              ? " to " + window.WIRAM.formatPaymentDetails(report.paymentMode, report)
              : "") +
            ". " +
            responseMessage;
          return updateStatus(report.id, "paid", notes).then(function (paid) {
            if (paid) {
              form.reset();
            }
            return paid;
          });
        })
        .catch(function (error) {
          window.WIRAM.showAlert(error.message || "Unable to initiate M-Pesa payment.", "error");
          return false;
        })
        .finally(function () {
          window.WIRAM.hideSpinner();
        });
    });

    form.dataset.bound = "true";
  }

  function bindFilters() {
    [
      { id: "myReportsFilter", fn: renderMyReports },
      { id: "claimStatusFilter", fn: renderClaimStatus },
      { id: "verifyFilter", fn: renderVerifyIncidents },
      { id: "adminReportsFilter", fn: renderAdminReports }
    ].forEach(function (item) {
      const node = document.getElementById(item.id);
      if (!node || node.dataset.bound) {
        return;
      }
      node.addEventListener("change", function () {
        void item.fn();
      });
      node.dataset.bound = "true";
    });
  }

  async function refreshReportViews() {
    await renderMyReports();
    await renderClaimStatus();
    await renderVerifyIncidents();
    await renderAdminReports();
    if (typeof window.WIRAM.refreshDashboardViews === "function") {
      await window.WIRAM.refreshDashboardViews();
    }
  }

  function bindReportForm() {
    const form = document.getElementById("reportForm");
    if (!form || form.dataset.bound) {
      return;
    }

    const paymentSelect = document.getElementById("paymentMode");
    const phoneInput = document.getElementById("reportPaymentPhone");
    const bankInput = document.getElementById("reportPaymentBankAccount");
    const currentUser = window.WIRAM.getCurrentUser();
    if (paymentSelect && currentUser && currentUser.paymentMode) {
      paymentSelect.value = window.WIRAM.normalizePaymentMode(currentUser.paymentMode);
    }
    if (phoneInput && currentUser && currentUser.paymentPhone) {
      phoneInput.value = window.WIRAM.normalizePaymentPhone(currentUser.paymentPhone);
    }
    if (bankInput && currentUser && currentUser.paymentBankAccount) {
      bankInput.value = window.WIRAM.normalizeBankAccount(currentUser.paymentBankAccount);
    }
    if (paymentSelect) {
      window.WIRAM.syncPaymentDetailFields(paymentSelect, phoneInput, bankInput);
      paymentSelect.addEventListener("change", function () {
        window.WIRAM.syncPaymentDetailFields(paymentSelect, phoneInput, bankInput);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      void submitReport();
    });
    form.dataset.bound = "true";
    bindImagePreview();
  }

  window.submitReport = submitReport;
  window.displayReports = displayReports;
  window.filterReports = filterReports;
  window.updateStatus = updateStatus;
  window.updatePaymentMode = updatePaymentMode;

  document.addEventListener("DOMContentLoaded", function () {
    bindReportForm();
    bindIncidentPaymentForm();
    bindFilters();
    void refreshReportViews();
  });
})();


