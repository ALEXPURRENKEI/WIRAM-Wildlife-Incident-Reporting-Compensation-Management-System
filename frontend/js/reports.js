(function () {
  "use strict";

  // Reads uploaded images locally so users can preview evidence before submit.
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

  function normalizeStatus(status) {
    return String(status || "").toLowerCase().trim();
  }

  // Shared status filter utility used by all report tables.
  function filterReports(status, reportsList) {
    const normalized = normalizeStatus(status);
    if (!normalized || normalized === "all") {
      return reportsList.slice();
    }

    return reportsList.filter(function (report) {
      return normalizeStatus(report.status) === normalized;
    });
  }

  // Saves a new incident report for the logged-in member.
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
    const imageFile = data.get("reportImage");

    if (!animalType || !incidentType || !location || !description) {
      window.WIRAM.showAlert("Please complete all required incident fields.", "error");
      return false;
    }

    if (!Number.isFinite(estimatedLoss) || estimatedLoss <= 0) {
      window.WIRAM.showAlert("Estimated loss must be greater than 0.", "error");
      return false;
    }

    let evidenceName = "";
    let evidenceData = "";

    try {
      window.WIRAM.showSpinner();

      if (imageFile && imageFile.name) {
        evidenceName = imageFile.name;
        evidenceData = await readAsDataUrl(imageFile);
      }

      const reports = window.WIRAM.getReports();
      const now = new Date().toISOString();
      reports.unshift({
        id: window.WIRAM.createId("RPT"),
        animalType: animalType,
        incidentType: incidentType,
        location: location,
        description: description,
        estimatedLoss: estimatedLoss,
        evidenceName: evidenceName,
        evidenceData: evidenceData,
        status: "pending",
        reporterId: currentUser.id,
        reporterName: currentUser.name,
        createdAt: now,
        updatedAt: now
      });

      window.WIRAM.setReports(reports);
      window.WIRAM.hideSpinner();
      window.WIRAM.showAlert("Incident report submitted successfully.", "success");

      if (form) {
        form.reset();
      }

      const preview = document.getElementById("imagePreview");
      if (preview) {
        preview.src = "";
        preview.classList.add("hidden");
      }

      return true;
    } catch (_error) {
      window.WIRAM.hideSpinner();
      window.WIRAM.showAlert("Unable to submit report. Please try again.", "error");
      return false;
    }
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

  // Generic table renderer reused by member, officer, and admin pages.
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
      const columns = includeReporter ? 9 : 8;
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
          (includeReporter ? "<td>" + window.WIRAM.escapeHtml(report.reporterName) + "</td>" : "") +
          "<td>" +
          window.WIRAM.escapeHtml(report.animalType) +
          "</td>" +
          "<td>" +
          window.WIRAM.escapeHtml(report.incidentType) +
          "</td>" +
          "<td>" +
          window.WIRAM.escapeHtml(report.location) +
          "</td>" +
          "<td>" +
          window.WIRAM.formatCurrency(report.estimatedLoss) +
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

  // Updates report workflow status: pending, verified, rejected, paid.
  function updateStatus(reportId, status) {
    const normalized = normalizeStatus(status);
    const valid = ["pending", "verified", "rejected", "paid"];
    if (valid.indexOf(normalized) === -1) {
      window.WIRAM.showAlert("Invalid status selected.", "error");
      return false;
    }

    const reports = window.WIRAM.getReports();
    const report = reports.find(function (item) {
      return item.id === reportId;
    });

    if (!report) {
      window.WIRAM.showAlert("Report was not found.", "error");
      return false;
    }

    report.status = normalized;
    report.updatedAt = new Date().toISOString();

    const currentUser = window.WIRAM.getCurrentUser();
    if (currentUser) {
      report.reviewedBy = currentUser.name;
    }

    window.WIRAM.setReports(reports);
    window.WIRAM.showAlert(
      "Report " + report.id + " updated to " + normalized + ".",
      "success"
    );

    refreshReportViews();
    return true;
  }

  // Modal details view for report deep dive.
  function openReportModal(reportId) {
    const reports = window.WIRAM.getReports();
    const report = reports.find(function (item) {
      return item.id === reportId;
    });
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
        : "<p class='muted'>No image preview available.</p>";

    modalBody.innerHTML =
      '<div class="modal-body-grid">' +
      '<div class="detail-item"><strong>Report ID</strong>' +
      window.WIRAM.escapeHtml(report.id) +
      "</div>" +
      '<div class="detail-item"><strong>Reporter</strong>' +
      window.WIRAM.escapeHtml(report.reporterName || "-") +
      "</div>" +
      '<div class="detail-item"><strong>Animal Type</strong>' +
      window.WIRAM.escapeHtml(report.animalType) +
      "</div>" +
      '<div class="detail-item"><strong>Incident Type</strong>' +
      window.WIRAM.escapeHtml(report.incidentType) +
      "</div>" +
      '<div class="detail-item"><strong>Location</strong>' +
      window.WIRAM.escapeHtml(report.location) +
      "</div>" +
      '<div class="detail-item"><strong>Estimated Loss</strong>' +
      window.WIRAM.formatCurrency(report.estimatedLoss) +
      "</div>" +
      '<div class="detail-item"><strong>Status</strong>' +
      statusBadge(report.status) +
      "</div>" +
      '<div class="detail-item"><strong>Submitted</strong>' +
      window.WIRAM.formatDate(report.createdAt) +
      "</div>" +
      '<div class="detail-item"><strong>Last Updated</strong>' +
      window.WIRAM.formatDate(report.updatedAt) +
      "</div>" +
      '<div class="detail-item"><strong>Evidence File</strong>' +
      window.WIRAM.escapeHtml(report.evidenceName || "Not provided") +
      "</div>" +
      '<div class="detail-item" style="grid-column: 1 / -1;"><strong>Description</strong>' +
      window.WIRAM.escapeHtml(report.description) +
      "</div>" +
      '<div class="detail-item" style="grid-column: 1 / -1;"><strong>Evidence Preview</strong>' +
      imageHtml +
      "</div>" +
      "</div>";

    window.WIRAM.openModal("reportModal");
  }

  // Event delegation for dynamic report action buttons inside tables.
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
        openReportModal(reportId);
        return;
      }

      if (action === "status") {
        const nextStatus = actionButton.getAttribute("data-next-status");
        updateStatus(reportId, nextStatus);
      }
    });

    tableBody.dataset.bound = "true";
  }

  // Attaches image preview behavior to the report form upload field.
  function bindImagePreview() {
    const imageInput = document.getElementById("reportImage");
    const preview = document.getElementById("imagePreview");
    if (!imageInput || !preview || imageInput.dataset.bound) {
      return;
    }

    imageInput.addEventListener("change", async function () {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        preview.src = "";
        preview.classList.add("hidden");
        return;
      }

      try {
        const dataUrl = await readAsDataUrl(file);
        preview.src = dataUrl;
        preview.classList.remove("hidden");
      } catch (_error) {
        window.WIRAM.showAlert("Could not preview that image.", "error");
      }
    });

    imageInput.dataset.bound = "true";
  }

  // Page-specific renderers.
  function renderMyReports() {
    const table = document.getElementById("myReportsTableBody");
    if (!table) {
      return;
    }

    const user = window.WIRAM.getCurrentUser();
    if (!user) {
      return;
    }

    const filter = document.getElementById("myReportsFilter");
    const filterValue = filter ? filter.value : "all";
    const allReports = window.WIRAM
      .getReports()
      .filter(function (report) {
        return report.reporterId === user.id;
      })
      .sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    const filtered = filterReports(filterValue, allReports);

    displayReports({
      tableBodyId: "myReportsTableBody",
      data: filtered,
      includeReporter: false,
      actionContext: "member",
      emptyMessage: "You have not submitted incident reports yet."
    });
  }

  function renderClaimStatus() {
    const table = document.getElementById("claimStatusTableBody");
    if (!table) {
      return;
    }

    const user = window.WIRAM.getCurrentUser();
    if (!user) {
      return;
    }

    const filter = document.getElementById("claimStatusFilter");
    const filterValue = filter ? filter.value : "all";
    const reports = window.WIRAM
      .getReports()
      .filter(function (report) {
        return report.reporterId === user.id;
      })
      .sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    const filtered = filterReports(filterValue, reports);

    displayReports({
      tableBodyId: "claimStatusTableBody",
      data: filtered,
      includeReporter: false,
      actionContext: "member",
      emptyMessage: "No claim statuses available yet."
    });

    window.WIRAM.populateSummaryCards(reports);
    window.WIRAM.renderStatusChart("claimChart", reports);
  }

  function renderVerifyIncidents() {
    const table = document.getElementById("verifyTableBody");
    if (!table) {
      return;
    }

    const filter = document.getElementById("verifyFilter");
    const filterValue = filter ? filter.value : "all";
    const reports = window.WIRAM
      .getReports()
      .slice()
      .sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    const filtered = filterReports(filterValue, reports);

    displayReports({
      tableBodyId: "verifyTableBody",
      data: filtered,
      includeReporter: true,
      actionContext: "officer",
      emptyMessage: "No incidents available for verification."
    });
  }

  function renderAdminReports() {
    const table = document.getElementById("adminReportsTableBody");
    if (!table) {
      return;
    }

    const filter = document.getElementById("adminReportsFilter");
    const filterValue = filter ? filter.value : "all";
    const reports = window.WIRAM
      .getReports()
      .slice()
      .sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    const filtered = filterReports(filterValue, reports);

    displayReports({
      tableBodyId: "adminReportsTableBody",
      data: filtered,
      includeReporter: true,
      actionContext: "admin",
      emptyMessage: "No incidents available."
    });
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
      node.addEventListener("change", item.fn);
      node.dataset.bound = "true";
    });
  }

  function refreshReportViews() {
    renderMyReports();
    renderClaimStatus();
    renderVerifyIncidents();
    renderAdminReports();
    if (typeof window.WIRAM.refreshDashboardViews === "function") {
      window.WIRAM.refreshDashboardViews();
    }
  }

  function bindReportForm() {
    const form = document.getElementById("reportForm");
    if (!form || form.dataset.bound) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitReport();
    });
    form.dataset.bound = "true";
    bindImagePreview();
  }

  window.submitReport = submitReport;
  window.displayReports = displayReports;
  window.filterReports = filterReports;
  window.updateStatus = updateStatus;

  document.addEventListener("DOMContentLoaded", function () {
    bindReportForm();
    bindFilters();
    refreshReportViews();
  });
})();
