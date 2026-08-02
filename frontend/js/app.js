(function () {
  "use strict";

  window.WIRAM_CONFIG = window.WIRAM_CONFIG || {};
  if (!window.WIRAM_CONFIG.API_BASE_URL) {
    const isLocalFrontend =
      window.location.protocol === "file:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    window.WIRAM_CONFIG.API_BASE_URL =
      isLocalFrontend ? "http://localhost:8080" : "https://wiram-spring-backend.onrender.com";
  }

  let apiUnavailable = false;

  // Centralized localStorage keys used across the whole application.
  const STORAGE_KEYS = {
    users: "wiram_users",
    reports: "wiram_reports",
    session: "wiram_session",
    flash: "wiram_flash",
    compensationContacts: "wiram_compensation_contacts"
  };

  const ROLE_HOME = {
    member: "dashboard.html",
    officer: "officer-dashboard.html",
    admin: "admin-dashboard.html"
  };

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  // Shared localStorage helpers.
  function getUsers() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.users), []);
  }

  function setUsers(users) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  }

  function getReports() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.reports), []);
  }

  function setReports(reports) {
    localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports));
  }

  function getCurrentUser() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.session), null);
  }
 
  function getCompensationContacts() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.compensationContacts), {});
  }
 
  function setCompensationContacts(contacts) {
    localStorage.setItem(STORAGE_KEYS.compensationContacts, JSON.stringify(contacts || {}));
  }
 
  function setCurrentUser(user) {
    if (!user) {
      clearCurrentUser();
      return;
    }

    const normalized = {
      id: user.id || null,
      name: user.name || "",
      email: user.email || "",
      role: normalizeRole(user.role),
      paymentMode: normalizePaymentMode(user.paymentMode),
      paymentPhone: normalizePaymentPhone(user.paymentPhone),
      paymentBankAccount: normalizeBankAccount(user.paymentBankAccount),
      profilePicture: user.profilePicture || user.avatar || user.photo || "",
      token: user.token || "",
      expiresAt: user.expiresAt || null
    };

    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(normalized));
  }

  function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  function setFlashMessage(message, type) {
    localStorage.setItem(
      STORAGE_KEYS.flash,
      JSON.stringify({ message: message, type: type || "success" })
    );
  }

  function consumeFlashMessage() {
    const raw = localStorage.getItem(STORAGE_KEYS.flash);
    if (!raw) {
      return null;
    }

    localStorage.removeItem(STORAGE_KEYS.flash);
    return safeParse(raw, null);
  }

  function createId(prefix) {
    return (
      prefix +
      "-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 7).toUpperCase()
    );
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function normalizeRole(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePaymentMode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function formatPaymentMode(value) {
    const labels = {
      MPESA: "M-Pesa",
      BANK_TRANSFER: "Bank Transfer",
      CASH: "Cash",
      CHEQUE: "Cheque"
    };
    const normalized = normalizePaymentMode(value);
    return labels[normalized] || normalized || "-";
  }

  function normalizePaymentPhone(value) {
    return String(value || "").trim();
  }

  function normalizeBankAccount(value) {
    return String(value || "").trim();
  }

  function getPaymentDetailsForMode(mode, details) {
    const normalizedMode = normalizePaymentMode(mode);
    const values = details || {};
    return {
      paymentPhone: normalizedMode === "MPESA" ? normalizePaymentPhone(values.paymentPhone) : "",
      paymentBankAccount:
        normalizedMode === "BANK_TRANSFER" ? normalizeBankAccount(values.paymentBankAccount) : ""
    };
  }

  function validatePaymentDetails(mode, details) {
    const normalizedMode = normalizePaymentMode(mode);
    const values = getPaymentDetailsForMode(normalizedMode, details);
    if (normalizedMode === "MPESA" && !values.paymentPhone) {
      throw new Error("Please enter your telephone number for M-Pesa payments.");
    }
    if (normalizedMode === "BANK_TRANSFER" && !values.paymentBankAccount) {
      throw new Error("Please enter your bank account number for bank transfer payments.");
    }
    return values;
  }

  function formatPaymentDetails(mode, details) {
    const normalizedMode = normalizePaymentMode(mode);
    const values = details || {};
    if (normalizedMode === "MPESA" && values.paymentPhone) {
      return "Phone: " + normalizePaymentPhone(values.paymentPhone);
    }
    if (normalizedMode === "BANK_TRANSFER" && values.paymentBankAccount) {
      return "Bank account: " + normalizeBankAccount(values.paymentBankAccount);
    }
    return "";
  }

  function syncPaymentDetailFields(select, phoneInput, bankInput) {
    if (!select) {
      return;
    }

    const mode = normalizePaymentMode(select.value);
    document.querySelectorAll(".payment-detail-fields").forEach(function (group) {
      const expectedMode = normalizePaymentMode(group.getAttribute("data-payment-detail"));
      const shouldShow = expectedMode && expectedMode === mode;
      group.classList.toggle("hidden", !shouldShow);
      group.querySelectorAll("input").forEach(function (input) {
        input.required = shouldShow;
        if (!shouldShow) {
          input.value = "";
        }
      });
    });

    if (phoneInput) {
      phoneInput.required = mode === "MPESA";
    }
    if (bankInput) {
      bankInput.required = mode === "BANK_TRANSFER";
    }
  }
  function getUserProfilePicture(user) {
    return user && (user.profilePicture || user.avatar || user.photo || "");
  }

  function getInitials(value) {
    const name = String(value || "").trim();
    if (!name) {
      return "U";
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function ensureProfilePicturePreviewModal() {
    if (document.getElementById("profilePictureModal")) {
      return;
    }

    const modal = document.createElement("div");
    modal.id = "profilePictureModal";
    modal.className = "profile-picture-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = [
      '<div class="profile-picture-modal-backdrop"></div>',
      '<div class="profile-picture-modal-dialog" role="dialog" aria-modal="true" aria-label="Profile picture preview">',
      '<button class="profile-picture-modal-close" type="button" aria-label="Close profile preview">×</button>',
      '<img class="profile-picture-modal-image" alt="Profile picture preview" />',
      '</div>'
    ].join("");
    document.body.appendChild(modal);

    const closeButton = modal.querySelector(".profile-picture-modal-close");
    const backdrop = modal.querySelector(".profile-picture-modal-backdrop");
    const closePreview = function () {
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("active");
    };

    if (closeButton) {
      closeButton.addEventListener("click", closePreview);
    }
    if (backdrop) {
      backdrop.addEventListener("click", closePreview);
    }
    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closePreview();
      }
    });
  }

  function openProfilePicturePreview(source) {
    ensureProfilePicturePreviewModal();
    const modal = document.getElementById("profilePictureModal");
    if (!modal || !source) {
      return;
    }

    const image = modal.querySelector(".profile-picture-modal-image");
    if (image) {
      image.src = source;
    }
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    modal.focus();
  }

  function renderUserProfileControls(user) {
    const profileUser = user || getCurrentUser();
    if (!profileUser) {
      return;
    }

    document.querySelectorAll(".topbar-user").forEach(function (container) {
      let control = container.querySelector(".js-profile-picture-control");
      if (!control) {
        const nameNode = container.querySelector(".js-user-name");
        control = document.createElement("label");
        control.className = "user-profile-control js-profile-picture-control";
        control.setAttribute("title", "Upload profile picture");
        control.innerHTML = [
          '<span class="user-avatar-btn" role="button" tabindex="0" aria-label="Upload profile picture">',
          '<img class="user-avatar-img js-user-avatar-image" alt="Profile picture" />',
          '<span class="user-avatar-fallback js-user-avatar-fallback"></span>',
          '<span class="user-avatar-camera">+</span>',
          '</span>',
          '<input type="file" accept="image/*" class="sr-only js-profile-picture-input" />'
        ].join("");

        if (nameNode) {
          container.insertBefore(control, nameNode);
        } else {
          container.prepend(control);
        }
      }

      const profileInput = control.querySelector(".js-profile-picture-input");
      if (profileInput && !profileInput.dataset.bound) {
        profileInput.addEventListener("change", function (event) {
          const file = event.target.files && event.target.files[0];
          if (!file) {
            return;
          }

          if (!file.type || !file.type.startsWith("image/")) {
            showAlert("Please choose an image file.", "error");
            event.target.value = "";
            return;
          }

          if (file.size > 2 * 1024 * 1024) {
            showAlert("Please choose an image smaller than 2MB.", "error");
            event.target.value = "";
            return;
          }

          const reader = new FileReader();
          reader.onload = function () {
            const nextPicture = reader.result;
            const currentUser = getCurrentUser();
            if (!currentUser) {
              return;
            }

            const updatedUser = Object.assign({}, currentUser, {
              profilePicture: nextPicture
            });
            setCurrentUser(updatedUser);

            const users = getUsers().slice();
            const existingIndex = users.findIndex(function (item) {
              return item.id === currentUser.id;
            });
            if (existingIndex >= 0) {
              users[existingIndex] = Object.assign({}, users[existingIndex], {
                profilePicture: nextPicture
              });
            } else {
              users.push(Object.assign({}, updatedUser, { createdAt: new Date().toISOString() }));
            }
            setUsers(users);
            renderUserProfileControls(updatedUser);
            showAlert("Profile picture updated.", "success");
          };
          reader.onerror = function () {
            showAlert("Unable to read the selected image.", "error");
          };
          reader.readAsDataURL(file);
          event.target.value = "";
        });
        profileInput.dataset.bound = "true";
      }

      const avatarButton = control.querySelector(".user-avatar-btn");
      if (avatarButton && !avatarButton.dataset.bound) {
        avatarButton.addEventListener("click", function (event) {
          const picture = getUserProfilePicture(profileUser);
          if (!picture) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          openProfilePicturePreview(picture);
        });
        avatarButton.addEventListener("keydown", function (event) {
          const picture = getUserProfilePicture(profileUser);
          if ((event.key === "Enter" || event.key === " ") && picture) {
            event.preventDefault();
            openProfilePicturePreview(picture);
          }
        });
        avatarButton.dataset.bound = "true";
      }

      const avatarImage = control.querySelector(".js-user-avatar-image");
      const avatarFallback = control.querySelector(".js-user-avatar-fallback");
      const picture = getUserProfilePicture(profileUser);
      if (avatarImage) {
        if (picture) {
          avatarImage.src = picture;
          avatarImage.removeAttribute("hidden");
        } else {
          avatarImage.removeAttribute("src");
          avatarImage.setAttribute("hidden", "hidden");
        }
      }

      if (avatarFallback) {
        if (picture) {
          avatarFallback.setAttribute("hidden", "hidden");
        } else {
          avatarFallback.removeAttribute("hidden");
          avatarFallback.textContent = getInitials(profileUser.name || profileUser.email || "");
        }
      }

      if (control) {
        control.dataset.profilePicture = picture || "";
        control.setAttribute("title", picture ? "View profile picture" : "Upload profile picture");
      }
    });
  }

  function getApiBaseUrl() {
    const candidates = [
      window.WIRAM_API_BASE_URL,
      window.localStorage.getItem("wiram_api_base_url"),
      window.WIRAM_CONFIG && window.WIRAM_CONFIG.API_BASE_URL,
      ""
    ];

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = String(candidates[index] || "").trim();
      if (candidate) {
        return candidate.replace(/\/+$/, "");
      }
    }

    return "";
  }

  function isApiConfigured() {
    return Boolean(getApiBaseUrl()) && !apiUnavailable;
  }

  function markApiUnavailable() {
    apiUnavailable = true;
  }

  function isLocalDemoMode() {
    return Boolean(
      (window.WIRAM_CONFIG && window.WIRAM_CONFIG.LOCAL_DEMO_MODE) ||
        window.localStorage.getItem("wiram_local_demo_mode") === "true"
    );
  }

  function shouldUseLocalData() {
    return !getApiBaseUrl() || isLocalDemoMode();
  }

  function isApiNetworkError(error) {
    return Boolean(error && error.isNetworkError);
  }

  function getAuthToken() {
    const currentUser = getCurrentUser();
    return currentUser && currentUser.token ? currentUser.token : "";
  }

  function normalizeSessionUser(user, token, expiresAt) {
    if (!user) {
      return null;
    }

    return {
      id: user.id || null,
      name: user.name || "",
      email: user.email || "",
      role: normalizeRole(user.role),
      paymentMode: normalizePaymentMode(user.paymentMode),
      paymentPhone: normalizePaymentPhone(user.paymentPhone),
      paymentBankAccount: normalizeBankAccount(user.paymentBankAccount),
      profilePicture: user.profilePicture || user.avatar || user.photo || "",
      token: token || user.token || "",
      expiresAt: expiresAt || user.expiresAt || null
    };
  }

  function normalizeUserRecord(user) {
    if (!user) {
      return user;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      paymentMode: normalizePaymentMode(user.paymentMode),
      paymentPhone: normalizePaymentPhone(user.paymentPhone),
      paymentBankAccount: normalizeBankAccount(user.paymentBankAccount),
      profilePicture: user.profilePicture || user.avatar || user.photo || "",
      createdAt: user.createdAt || null,
      updatedAt: user.updatedAt || null
    };
  }

  function normalizeReportRecord(report) {
    if (!report) {
      return report;
    }

    const status = normalizeStatus(report.status);
    return {
      id: report.id,
      animalType: report.animalType || "",
      incidentType: report.incidentType || "",
      location: report.location || "",
      description: report.description || "",
      estimatedLoss: report.estimatedLoss || 0,
      evidenceName: report.evidenceName || "",
      evidenceData: report.evidenceData || "",
      status: status,
      reporterId: report.reporterId || report.reporter?.id || report.reporter?.uuid || "",
      reporterName: report.reporterName || report.reporter?.name || "",
      reporterEmail: report.reporterEmail || report.reporter?.email || "",
      paymentMode: normalizePaymentMode(report.paymentMode),
      paymentPhone: normalizePaymentPhone(report.paymentPhone),
      paymentBankAccount: normalizeBankAccount(report.paymentBankAccount),
      reviewedBy: report.reviewedBy || "",
      reviewedByName: report.reviewedByName || "",
      reviewedAt: report.reviewedAt || null,
      createdAt: report.createdAt || null,
      updatedAt: report.updatedAt || null,
      hasEvidence:
        typeof report.hasEvidence === "boolean"
          ? report.hasEvidence
          : Boolean(report.evidenceData && String(report.evidenceData).trim()),
      history: Array.isArray(report.history) ? report.history : []
    };
  }

  function updateUsersCache(users) {
    setUsers((users || []).map(normalizeUserRecord));
  }

  function updateReportsCache(reports) {
    setReports((reports || []).map(normalizeReportRecord));
  }

  async function parseApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") !== -1) {
      return response.json();
    }
    return response.text();
  }

  async function apiRequest(path, options) {
    if (!isApiConfigured()) {
      throw new Error("API base URL is not configured.");
    }

    const requestOptions = options || {};
    const headers = new Headers(requestOptions.headers || {});
    const token = getAuthToken();
    const body = requestOptions.body;

    if (token) {
      headers.set("Authorization", "Bearer " + token);
    }

    if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let response;
    try {
      response = await fetch(getApiBaseUrl() + path, {
        method: requestOptions.method || "GET",
        headers: headers,
        body: body
      });
    } catch (error) {
      markApiUnavailable();
      const networkError = new Error(
        "Unable to reach the WIRAM API. Check that the backend is running, or use the local demo accounts."
      );
      networkError.cause = error;
      networkError.isNetworkError = true;
      throw networkError;
    }

    const payload = await parseApiResponse(response);
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && payload.message
          ? payload.message
          : "Request failed.";
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function getPayloadArray(payload, key) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload[key])) {
      return payload[key];
    }

    return [];
  }

  function getPayloadObject(payload, key) {
    if (payload && payload[key]) {
      return payload[key];
    }

    return payload;
  }

  function filterReportsForCurrentUser(reports, status) {
    const currentUser = getCurrentUser();
    const normalizedStatus = normalizeStatus(status || "all");

    return reports.filter(function (report) {
      const belongsToCurrentUser =
        !currentUser ||
        normalizeRole(currentUser.role) !== "member" ||
        report.reporterId === currentUser.id;
      const matchesStatus =
        !normalizedStatus || normalizedStatus === "all" || normalizeStatus(report.status) === normalizedStatus;
      return belongsToCurrentUser && matchesStatus;
    });
  }

  async function loadReportsForCurrentUser(status) {
    if (shouldUseLocalData()) {
      return filterReportsForCurrentUser(getReports().map(normalizeReportRecord), status);
    }

    let payload;
    try {
      payload = await apiRequest("/api/reports");
    } catch (error) {
      if (isApiNetworkError(error) && shouldUseLocalData()) {
        return filterReportsForCurrentUser(getReports().map(normalizeReportRecord), status);
      }
      throw error;
    }

    const reports = getPayloadArray(payload, "reports").map(normalizeReportRecord);
    updateReportsCache(reports);
    return filterReportsForCurrentUser(reports, status);
  }

  async function loadReportsForAllUsers(status) {
    if (shouldUseLocalData()) {
      const normalizedStatus = normalizeStatus(status || "all");
      return getReports()
        .map(normalizeReportRecord)
        .filter(function (report) {
          return !normalizedStatus || normalizedStatus === "all" || normalizeStatus(report.status) === normalizedStatus;
        });
    }

    let payload;
    try {
      payload = await apiRequest("/api/reports");
    } catch (error) {
      if (isApiNetworkError(error) && shouldUseLocalData()) {
        return loadReportsForAllUsers(status);
      }
      throw error;
    }

    const reports = getPayloadArray(payload, "reports").map(normalizeReportRecord);
    updateReportsCache(reports);
    const normalizedStatus = normalizeStatus(status || "all");
    return reports.filter(function (report) {
      return !normalizedStatus || normalizedStatus === "all" || normalizeStatus(report.status) === normalizedStatus;
    });
  }

  async function loadUsersForAdmin() {
    if (shouldUseLocalData()) {
      return getUsers().map(normalizeUserRecord);
    }

    let payload;
    try {
      payload = await apiRequest("/api/users");
    } catch (error) {
      if (isApiNetworkError(error) && shouldUseLocalData()) {
        return getUsers().map(normalizeUserRecord);
      }
      throw error;
    }

    const users = getPayloadArray(payload, "users").map(normalizeUserRecord);
    updateUsersCache(users);
    return users;
  }

  async function loadDashboardData() {
    if (shouldUseLocalData()) {
      const reports = getReports();
      const users = getUsers();
      const counts = statusCounts(reports);

      return {
        totalReports: counts.total,
        pendingReports: counts.pending,
        verifiedReports: counts.verified,
        rejectedReports: counts.rejected,
        paidReports: counts.paid,
        memberCount: users.filter(function (user) {
          return normalizeRole(user.role) === "member";
        }).length,
        officerCount: users.filter(function (user) {
          return normalizeRole(user.role) === "officer";
        }).length,
        adminCount: users.filter(function (user) {
          return normalizeRole(user.role) === "admin";
        }).length,
        recentReports: reports.slice(0, 8).map(normalizeReportRecord)
      };
    }

    let payload;
    try {
      payload = await apiRequest("/api/dashboard");
    } catch (error) {
      if (isApiNetworkError(error) && shouldUseLocalData()) {
        return loadDashboardData();
      }
      throw error;
    }
    const recentReports = Array.isArray(payload.recentReports)
      ? payload.recentReports.map(normalizeReportRecord)
      : [];

    return {
      totalReports: Number(payload.totalReports) || 0,
      pendingReports: Number(payload.pendingReports) || 0,
      verifiedReports: Number(payload.verifiedReports) || 0,
      rejectedReports: Number(payload.rejectedReports) || 0,
      paidReports: Number(payload.paidReports) || 0,
      memberCount: Number(payload.memberCount) || 0,
      officerCount: Number(payload.officerCount) || 0,
      adminCount: Number(payload.adminCount) || 0,
      recentReports: recentReports
    };
  }

  async function loadReportDetail(reportId) {
    if (shouldUseLocalData()) {
      const report = getReports().find(function (item) {
        return item.id === reportId;
      });
      if (!report) {
        throw new Error("Report not found.");
      }
      return report;
    }

    let payload;
    try {
      payload = await apiRequest("/api/reports/" + encodeURIComponent(reportId));
    } catch (error) {
      if (isApiNetworkError(error) && shouldUseLocalData()) {
        return loadReportDetail(reportId);
      }
      throw error;
    }
    const reportPayload = getPayloadObject(payload, "report");
    const detail = normalizeReportRecord(reportPayload);
    if (reportPayload && Array.isArray(reportPayload.history)) {
      detail.history = reportPayload.history.map(function (history) {
        return {
          id: history.id,
          status: normalizeStatus(history.status),
          notes: history.notes || "",
          changedByName: history.changedByName || "",
          changedAt: history.changedAt || null
        };
      });
    }
    return detail;
  }

  async function submitRemoteReport(payload) {
    const response = await apiRequest("/api/reports", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return normalizeReportRecord(getPayloadObject(response, "report"));
  }

  async function updateRemoteReportStatus(reportId, status, notes) {
    const response = await apiRequest("/api/reports/" + encodeURIComponent(reportId) + "/status", {
      method: "PATCH",
      body: JSON.stringify({
        status: String(status || "").toUpperCase(),
        notes: notes || ""
      })
    });
    return normalizeReportRecord(getPayloadObject(response, "report"));
  }

  async function updateRemoteReportPaymentMode(reportId, paymentMode) {
    const response = await apiRequest(
      "/api/reports/" + encodeURIComponent(reportId) + "/payment-mode",
      {
        method: "PATCH",
        body: JSON.stringify({
          paymentMode: normalizePaymentMode(paymentMode)
        })
      }
    );
    return normalizeReportRecord(getPayloadObject(response, "report"));
  }

  async function updateRemoteUserRole(userId, role) {
    const response = await apiRequest("/api/users/" + encodeURIComponent(userId) + "/role", {
      method: "PATCH",
      body: JSON.stringify({
        role: String(role || "").toUpperCase()
      })
    });
    return normalizeUserRecord(getPayloadObject(response, "user"));
  }

  async function updateRemotePaymentMode(paymentMode, details) {
    const paymentDetails = getPaymentDetailsForMode(paymentMode, details);
    const response = await apiRequest("/api/users/me/payment-mode", {
      method: "PATCH",
      body: JSON.stringify({
        paymentMode: normalizePaymentMode(paymentMode),
        paymentPhone: paymentDetails.paymentPhone,
        paymentBankAccount: paymentDetails.paymentBankAccount
      })
    });
    return normalizeUserRecord(getPayloadObject(response, "user"));
  }

  async function loginRemoteUser(payload) {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return {
      token: response.token,
      expiresAt: response.expiresAt,
      user: normalizeSessionUser(response.user, response.token, response.expiresAt)
    };
  }

  async function registerRemoteUser(payload) {
    const response = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return {
      token: response.token,
      expiresAt: response.expiresAt,
      user: normalizeSessionUser(response.user, response.token, response.expiresAt)
    };
  }

  async function logoutRemoteUser() {
    if (!isApiConfigured()) {
      return true;
    }

    await apiRequest("/api/auth/logout", {
      method: "POST"
    });
    return true;
  }

  async function verifyCurrentSession() {
    if (!isApiConfigured()) {
      return getCurrentUser();
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      return null;
    }

    if (!currentUser.token) {
      return currentUser;
    }

    try {
      const response = await apiRequest("/api/auth/me");
      const userPayload = getPayloadObject(response, "user");
      const session = normalizeSessionUser(userPayload, currentUser.token, currentUser.expiresAt);
      if (session && session.token) {
        window.localStorage.removeItem("wiram_local_demo_mode");
      }
      setCurrentUser(session);
      return session;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearCurrentUser();
        return null;
      }
      throw error;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getRoleHome(role) {
    return ROLE_HOME[normalizeRole(role)] || "index.html";
  }

  // Inject alert and spinner containers once so each page can use them.
  function ensureUiContainers() {
    if (!document.getElementById("alertContainer")) {
      const alertContainer = document.createElement("div");
      alertContainer.id = "alertContainer";
      alertContainer.className = "alert-container";
      document.body.appendChild(alertContainer);
    }

    if (!document.getElementById("sidebarBackdrop")) {
      const sidebarBackdrop = document.createElement("button");
      sidebarBackdrop.id = "sidebarBackdrop";
      sidebarBackdrop.className = "sidebar-backdrop";
      sidebarBackdrop.type = "button";
      sidebarBackdrop.setAttribute("aria-label", "Close navigation");
      sidebarBackdrop.tabIndex = -1;
      document.body.appendChild(sidebarBackdrop);
    }

    if (!document.getElementById("loadingSpinner")) {
      const spinner = document.createElement("div");
      spinner.id = "loadingSpinner";
      spinner.className = "spinner-overlay";
      spinner.innerHTML = '<div class="spinner" aria-label="Loading"></div>';
      document.body.appendChild(spinner);
    }
  }

  // Toast-style notifications used for success/error feedback.
  function showAlert(message, type) {
    const container = document.getElementById("alertContainer");
    if (!container || !message) {
      return;
    }

    const alertType = type || "success";
    const alert = document.createElement("div");
    alert.className = "alert alert-" + alertType;
    alert.textContent = message;
    container.appendChild(alert);

    window.setTimeout(function () {
      alert.remove();
    }, 4000);
  }

  function showSpinner() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.classList.add("active");
    }
  }

  function hideSpinner() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
      spinner.classList.remove("active");
    }
  }

  function statusCounts(reports) {
    const counts = {
      total: reports.length,
      pending: 0,
      verified: 0,
      rejected: 0,
      paid: 0
    };

    reports.forEach(function (report) {
      const status = (report.status || "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] += 1;
      }
    });

    return counts;
  }

  // Fills dashboard summary cards by using each card's data-count attribute.
  function populateSummaryCards(reports, root) {
    const scope = root || document;
    const counts = statusCounts(reports);
    const nodes = scope.querySelectorAll("[data-count]");

    nodes.forEach(function (node) {
      const key = node.getAttribute("data-count");
      const value = Object.prototype.hasOwnProperty.call(counts, key)
        ? counts[key]
        : 0;
      node.textContent = String(value);
    });
  }

  function populateSummaryCardsFromDashboard(dashboard, root) {
    const scope = root || document;
    const counts = {
      total: Number(dashboard.totalReports) || 0,
      pending: Number(dashboard.pendingReports) || 0,
      verified: Number(dashboard.verifiedReports) || 0,
      rejected: Number(dashboard.rejectedReports) || 0,
      paid: Number(dashboard.paidReports) || 0
    };

    scope.querySelectorAll("[data-count]").forEach(function (node) {
      const key = node.getAttribute("data-count");
      const value = Object.prototype.hasOwnProperty.call(counts, key) ? counts[key] : 0;
      node.textContent = String(value);
    });
  }

  function reportsFromDashboardCounts(dashboard) {
    const counts = [
      { status: "pending", count: Number(dashboard.pendingReports) || 0 },
      { status: "verified", count: Number(dashboard.verifiedReports) || 0 },
      { status: "rejected", count: Number(dashboard.rejectedReports) || 0 },
      { status: "paid", count: Number(dashboard.paidReports) || 0 }
    ];
    const reports = [];

    counts.forEach(function (item) {
      for (let index = 0; index < item.count; index += 1) {
        reports.push({ status: item.status });
      }
    });

    return reports;
  }

  // Renders Chart.js doughnut charts if Chart.js is present on the page.
  function renderStatusChart(canvasId, reports) {
    if (typeof window.Chart === "undefined") {
      return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return;
    }

    const counts = statusCounts(reports);
    const data = [counts.pending, counts.verified, counts.rejected, counts.paid];

    const existing = window.Chart.getChart(canvas);
    if (existing) {
      existing.destroy();
    }

    new window.Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Pending", "Verified", "Rejected", "Paid"],
        datasets: [
          {
            data: data,
            backgroundColor: ["#F0C96A", "#62A8D1", "#D37567", "#4FA37A"],
            borderWidth: 0
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            position: "bottom"
          }
        },
        cutout: "62%"
      }
    });
  }

  // Protect role-restricted pages on the client side.
  function enforceAccess() {
    const body = document.body;
    const page = body.dataset.page || "";
    const requiresAuth = body.dataset.auth === "true";
    const roles = (body.dataset.roles || "")
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
    const user = getCurrentUser();

    if ((page === "login" || page === "register") && user) {
      window.location.href = getRoleHome(user.role);
      return;
    }

    if (!requiresAuth) {
      return;
    }

    if (!user) {
      setFlashMessage("Please log in to continue.", "error");
      window.location.href = "login.html";
      return;
    }

    const currentRole = normalizeRole(user.role);

    if (roles.length > 0 && roles.indexOf(currentRole) === -1) {
      setFlashMessage("You do not have permission to view that page.", "error");
      window.location.href = getRoleHome(currentRole);
    }
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  // Shared UI hooks for sidebars, modals, logout buttons, and user labels.
  function wireCommonUi() {
    const user = getCurrentUser();
    if (user) {
      document.querySelectorAll(".js-user-name").forEach(function (node) {
        node.textContent = user.name;
      });

      document.querySelectorAll(".js-user-role").forEach(function (node) {
        node.textContent = user.role;
      });

      document.querySelectorAll(".js-payment-mode").forEach(function (node) {
        node.textContent = formatPaymentMode(user.paymentMode);
      });

      renderUserProfileControls(user);
    }

    document.querySelectorAll(".js-current-year").forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });

    document.querySelectorAll(".js-sidebar-toggle").forEach(function (button) {
      button.addEventListener("click", function () {
        document.body.classList.toggle("sidebar-open");
      });
    });

    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    if (sidebarBackdrop && !sidebarBackdrop.dataset.bound) {
      sidebarBackdrop.addEventListener("click", function () {
        document.body.classList.remove("sidebar-open");
      });
      sidebarBackdrop.dataset.bound = "true";
    }

    document.querySelectorAll(".sidebar-nav a").forEach(function (link) {
      link.addEventListener("click", function () {
        document.body.classList.remove("sidebar-open");
      });
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) {
        document.body.classList.remove("sidebar-open");
      }
    });

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        document.body.classList.remove("sidebar-open");
      }
    });

    document.querySelectorAll(".js-modal-close").forEach(function (button) {
      button.addEventListener("click", function () {
        const modalId = button.getAttribute("data-modal");
        if (modalId) {
          closeModal(modalId);
        }
      });
    });

    document.querySelectorAll(".modal").forEach(function (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) {
          modal.classList.remove("open");
          modal.setAttribute("aria-hidden", "true");
        }
      });
    });

    document.querySelectorAll(".js-logout").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        if (typeof window.logoutUser === "function") {
          window.logoutUser();
        } else {
          clearCurrentUser();
          window.location.href = "login.html";
        }
      });
    });
  }

  function setLocalPaymentMode(paymentMode, details) {
    const normalized = normalizePaymentMode(paymentMode);
    const paymentDetails = getPaymentDetailsForMode(normalized, details);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const updatedUser = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      paymentMode: normalized,
      paymentPhone: paymentDetails.paymentPhone,
      paymentBankAccount: paymentDetails.paymentBankAccount,
      profilePicture: currentUser.profilePicture,
      token: currentUser.token,
      expiresAt: currentUser.expiresAt
    };
    setCurrentUser(updatedUser);

    const users = getUsers().map(function (user) {
      if (user.id !== currentUser.id) {
        return user;
      }
      return Object.assign({}, user, {
        paymentMode: normalized,
        paymentPhone: paymentDetails.paymentPhone,
        paymentBankAccount: paymentDetails.paymentBankAccount
      });
    });
    setUsers(users);

    return updatedUser;
  }

  async function savePaymentMode(paymentMode, details) {
    const normalized = normalizePaymentMode(paymentMode);
    if (!normalized) {
      throw new Error("Please select a payment mode.");
    }
    const paymentDetails = validatePaymentDetails(normalized, details);

    if (isApiConfigured()) {
      try {
        const savedUser = await updateRemotePaymentMode(normalized, paymentDetails);
        return setLocalPaymentMode(savedUser.paymentMode, savedUser);
      } catch (error) {
        if (!isApiNetworkError(error)) {
          throw error;
        }
      }
    }

    return setLocalPaymentMode(normalized, paymentDetails);
  }

  function initPaymentModeForm() {
    const form = document.getElementById("paymentModeForm");
    const select = document.getElementById("paymentMode");
    const phoneInput = document.getElementById("paymentPhone");
    const bankInput = document.getElementById("paymentBankAccount");
    if (!form || !select || form.dataset.bound) {
      return;
    }

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.paymentMode) {
      select.value = normalizePaymentMode(currentUser.paymentMode);
    }
    if (phoneInput && currentUser && currentUser.paymentPhone) {
      phoneInput.value = normalizePaymentPhone(currentUser.paymentPhone);
    }
    if (bankInput && currentUser && currentUser.paymentBankAccount) {
      bankInput.value = normalizeBankAccount(currentUser.paymentBankAccount);
    }
    syncPaymentDetailFields(select, phoneInput, bankInput);

    select.addEventListener("change", function () {
      syncPaymentDetailFields(select, phoneInput, bankInput);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      showSpinner();
      savePaymentMode(select.value, {
        paymentPhone: phoneInput ? phoneInput.value : "",
        paymentBankAccount: bankInput ? bankInput.value : ""
      })
        .then(function (updatedUser) {
          if (updatedUser) {
            select.value = normalizePaymentMode(updatedUser.paymentMode);
            if (phoneInput) {
              phoneInput.value = normalizePaymentPhone(updatedUser.paymentPhone);
            }
            if (bankInput) {
              bankInput.value = normalizeBankAccount(updatedUser.paymentBankAccount);
            }
            syncPaymentDetailFields(select, phoneInput, bankInput);
            document.querySelectorAll(".js-payment-mode").forEach(function (node) {
              node.textContent = formatPaymentMode(updatedUser.paymentMode);
            });
          }
          showAlert("Payment preference saved.", "success");
        })
        .catch(function (error) {
          showAlert(error.message || "Unable to save payment preference.", "error");
        })
        .finally(function () {
          hideSpinner();
        });
    });

    form.dataset.bound = "true";
  }

  function initCompensationContactForms() {
    const communityForm = document.getElementById("communityCompensationForm");
    const partnerForm = document.getElementById("partnerCompensationForm");
    const communityPhoneInput = document.getElementById("communityCompensationPhone");
    const partnerPhoneInput = document.getElementById("partnerCompensationPhone");
    const partnerOrgSelect = document.getElementById("partnerCompensationOrg");

    if (!communityForm && !partnerForm) {
      return;
    }

    const contacts = getCompensationContacts();
    if (communityPhoneInput) {
      const currentUser = getCurrentUser();
      const currentPhone = currentUser && currentUser.paymentPhone ? normalizePaymentPhone(currentUser.paymentPhone) : "";
      communityPhoneInput.value = currentPhone || normalizePaymentPhone(contacts.communityPhone);
    }

    if (partnerPhoneInput) {
      partnerPhoneInput.value = normalizePaymentPhone(contacts.partnerPhone);
    }

    if (partnerOrgSelect) {
      partnerOrgSelect.value = contacts.partnerOrganization || "";
    }

    if (communityForm) {
      communityForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!communityPhoneInput) {
          return;
        }

        const phone = normalizePaymentPhone(communityPhoneInput.value);
        if (!phone) {
          showAlert("Please enter a phone number for compensation.", "error");
          return;
        }

        const currentUser = getCurrentUser();
        if (currentUser) {
          showSpinner();
          const preferredMode = normalizePaymentMode(currentUser.paymentMode) || "MPESA";
          savePaymentMode(preferredMode, {
            paymentPhone: phone,
            paymentBankAccount: currentUser.paymentBankAccount || ""
          })
            .then(function () {
              showAlert("Compensation phone number saved to your profile.", "success");
            })
            .catch(function (error) {
              showAlert(error.message || "Unable to save your compensation phone number.", "error");
            })
            .finally(function () {
              hideSpinner();
            });
          return;
        }

        const updatedContacts = getCompensationContacts();
        updatedContacts.communityPhone = phone;
        setCompensationContacts(updatedContacts);
        showAlert("Phone number saved on this device. Sign in to attach it to your account.", "success");
      });
    }

    if (partnerForm) {
      partnerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!partnerPhoneInput || !partnerOrgSelect) {
          return;
        }

        const organization = String(partnerOrgSelect.value || "").trim();
        const phone = normalizePaymentPhone(partnerPhoneInput.value);
        if (!organization) {
          showAlert("Please select an organization for the compensation payment.", "error");
          return;
        }
        if (!phone) {
          showAlert("Please enter a phone number for compensation payments.", "error");
          return;
        }

        const updatedContacts = getCompensationContacts();
        updatedContacts.partnerOrganization = organization;
        updatedContacts.partnerPhone = phone;
        setCompensationContacts(updatedContacts);
        showAlert("Enter M-Pesa PIN for the KWS/Enkaretoni number to complete the payment.", "success");
      });
    }
  }

  // Admin user table rendering and role updates.
  async function renderUsersTable() {
    const tableBody = document.getElementById("usersTableBody");
    if (!tableBody) {
      return;
    }

    const roleFilter = document.getElementById("usersRoleFilter");
    const selectedRole = roleFilter ? normalizeRole(roleFilter.value) : "all";
    let users = getUsers().slice();

    try {
      users = await loadUsersForAdmin();
    } catch (error) {
      if (!users.length) {
        showAlert(error.message || "Unable to load users.", "error");
        tableBody.innerHTML =
          '<tr><td colspan="6" class="table-empty">Unable to load users.</td></tr>';
        return;
      }
    }

    users = users.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    tableBody.__users = users;
    const filtered =
      selectedRole === "all"
        ? users
        : users.filter(function (user) {
            return normalizeRole(user.role) === selectedRole;
          });

    if (!filtered.length) {
      tableBody.innerHTML =
        '<tr><td colspan="6" class="table-empty">No users found for this role.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered
      .map(function (user) {
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(user.name) +
          "</td>" +
          "<td>" +
          escapeHtml(user.email) +
          "</td>" +
          '<td><span class="role-chip role-' +
          escapeHtml(normalizeRole(user.role)) +
          '">' +
          escapeHtml(normalizeRole(user.role)) +
          "</span></td>" +
          "<td>" +
          formatDate(user.createdAt) +
          "</td>" +
          "<td>" +
          '<select data-user-role="' +
          escapeHtml(user.id) +
          '">' +
          '<option value="member"' +
          (normalizeRole(user.role) === "member" ? " selected" : "") +
          ">Member</option>" +
          '<option value="officer"' +
          (normalizeRole(user.role) === "officer" ? " selected" : "") +
          ">Officer</option>" +
          '<option value="admin"' +
          (normalizeRole(user.role) === "admin" ? " selected" : "") +
          ">Admin</option>" +
          "</select>" +
          "</td>" +
          "<td>" +
          '<button class="btn btn-secondary btn-sm" data-action="save-role" data-user-id="' +
          escapeHtml(user.id) +
          '">Save Role</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  async function initManageUsersPage() {
    const tableBody = document.getElementById("usersTableBody");
    if (!tableBody) {
      return;
    }

    const filter = document.getElementById("usersRoleFilter");
    if (filter && !filter.dataset.bound) {
      filter.addEventListener("change", renderUsersTable);
      filter.dataset.bound = "true";
    }

    if (!tableBody.dataset.bound) {
      tableBody.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-action='save-role']");
        if (!button) {
          return;
        }

        const userId = button.getAttribute("data-user-id");
        const select = tableBody.querySelector(
          "select[data-user-role='" + userId + "']"
        );
        const users = tableBody.__users || getUsers();
        const user = users.find(function (item) {
          return item.id === userId;
        });

        if (!user || !select) {
          showAlert("Unable to update that user.", "error");
          return;
        }

        const nextRole = normalizeRole(select.value);
        user.role = nextRole;

        if (isApiConfigured()) {
          showSpinner();
            updateRemoteUserRole(userId, nextRole)
            .then(function (updatedUser) {
              const refreshedUsers = (tableBody.__users || getUsers()).map(function (item) {
                return item.id === updatedUser.id ? updatedUser : item;
              });
              tableBody.__users = refreshedUsers;
              const currentUser = getCurrentUser();
              if (currentUser && currentUser.id === updatedUser.id) {
                setCurrentUser({
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email,
                  role: updatedUser.role,
                  paymentMode: currentUser.paymentMode,
                  token: currentUser.token,
                  expiresAt: currentUser.expiresAt
                });
                setFlashMessage(
                  "Your role was updated. You were redirected to the correct dashboard.",
                  "info"
                );
                window.location.href = getRoleHome(updatedUser.role);
                return;
              }

              showAlert("User role updated successfully.", "success");
              renderUsersTable();
            })
            .catch(function (error) {
              showAlert(error.message || "Unable to update that user.", "error");
            })
            .finally(function () {
              hideSpinner();
            });
          return;
        }

        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === user.id) {
          currentUser.role = nextRole;
          setCurrentUser(currentUser);
          setFlashMessage(
            "Your role was updated. You were redirected to the correct dashboard.",
            "info"
          );
          window.location.href = getRoleHome(currentUser.role);
          return;
        }

        tableBody.__users = users;
        showAlert("User role updated successfully.", "success");
        renderUsersTable();
      });
      tableBody.dataset.bound = "true";
    }

    await renderUsersTable();
  }

  // Dashboard hydration for member, officer, and admin home pages.
  async function refreshDashboardViews() {
    const page = document.body.dataset.page || "";
    const user = getCurrentUser();

    if (!user) {
      return;
    }

    let reports = getReports().slice();
    let dashboard = null;
    try {
      dashboard = await loadDashboardData();
      if (page === "officer-dashboard") {
        reports = await loadReportsForCurrentUser();
      } else {
        reports =
          Array.isArray(dashboard.recentReports) && dashboard.recentReports.length
            ? dashboard.recentReports
            : await loadReportsForCurrentUser();
      }
    } catch (error) {
      try {
        reports = await loadReportsForCurrentUser();
      } catch (_reportsError) {
        // Keep the local cache fallback below.
      }

      if (!reports.length && !dashboard) {
        showAlert(error.message || "Unable to load reports.", "error");
        return;
      }
    }

    reports = reports.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (page === "dashboard") {
      const userReports = reports.slice();
      if (dashboard) {
        populateSummaryCardsFromDashboard(dashboard);
        renderStatusChart("memberChart", reportsFromDashboardCounts(dashboard));
      } else {
        populateSummaryCards(userReports);
        renderStatusChart("memberChart", userReports);
      }

      if (typeof window.displayReports === "function") {
        window.displayReports({
          tableBodyId: "memberRecentTableBody",
          data: userReports.slice(0, 5),
          includeReporter: false,
          actionContext: "member",
          emptyMessage: "You have not submitted reports yet."
        });
      }
    }

    if (page === "officer-dashboard") {
      if (dashboard) {
        populateSummaryCardsFromDashboard(dashboard);
        renderStatusChart("officerChart", reportsFromDashboardCounts(dashboard));
      } else {
        populateSummaryCards(reports);
        renderStatusChart("officerChart", reports);
      }

      if (typeof window.displayReports === "function") {
        const pending = reports.filter(function (item) {
          return item.status === "pending";
        });
        window.displayReports({
          tableBodyId: "officerPendingTableBody",
          data: pending.slice(0, 8),
          includeReporter: true,
          actionContext: "officer",
          emptyMessage: "No pending incidents at the moment."
        });
      }
    }

    if (page === "admin-dashboard") {
      if (dashboard) {
        populateSummaryCardsFromDashboard(dashboard);
      } else {
        populateSummaryCards(reports);
      }
      let users = getUsers();
      try {
        users = await loadUsersForAdmin();
      } catch (_error) {
        users = users || [];
      }
      const userCount = document.getElementById("totalUsersCount");
      if (userCount) {
        userCount.textContent = dashboard
          ? String(dashboard.memberCount + dashboard.officerCount + dashboard.adminCount)
          : String(users.length);
      }
      renderStatusChart("adminChart", dashboard ? reportsFromDashboardCounts(dashboard) : reports);

      if (typeof window.displayReports === "function") {
        window.displayReports({
          tableBodyId: "adminRecentTableBody",
          data: reports.slice(0, 8),
          includeReporter: true,
          actionContext: "admin",
          emptyMessage: "No incident records available."
        });
      }
    }
  }

  // Loads first-run sample users and incident reports for demo/testing.
  function seedMockData() {
    const users = getUsers();
    if (!users.length) {
      setUsers([
        {
          id: "USR-MEMBER-001",
          name: "Miriam Njeri",
          email: "member@wiram.org",
          password: "password123",
          role: "member",
          paymentMode: "MPESA",
          createdAt: "2026-02-06T09:00:00.000Z"
        },
        {
          id: "USR-MEMBER-002",
          name: "Daniel Mwangi",
          email: "community@wiram.org",
          password: "password123",
          role: "member",
          paymentMode: "MPESA",
          createdAt: "2026-02-11T09:00:00.000Z"
        },
        {
          id: "USR-OFFICER-001",
          name: "Officer Grace Otieno",
          email: "officer@wiram.org",
          password: "password123",
          role: "officer",
          paymentMode: "BANK_TRANSFER",
          createdAt: "2026-01-28T09:00:00.000Z"
        },
        {
          id: "USR-ADMIN-001",
          name: "Admin Alex Pure",
          email: "admin@wiram.org",
          password: "password123",
          role: "admin",
          paymentMode: "BANK_TRANSFER",
          createdAt: "2026-01-20T09:00:00.000Z"
        }
      ]);
    }

    const reports = getReports();
    if (!reports.length) {
      setReports([
        {
          id: "RPT-1001",
          animalType: "Elephant",
          incidentType: "Crop Damage",
          location: "Narok East",
          description: "A herd of elephants destroyed maize on two acres overnight.",
          estimatedLoss: 1400,
          evidenceName: "elephant-crop.jpg",
          evidenceData: "",
          status: "pending",
          reporterId: "USR-MEMBER-001",
          reporterName: "Miriam Njeri",
          createdAt: "2026-03-20T07:20:00.000Z",
          updatedAt: "2026-03-20T07:20:00.000Z"
        },
        {
          id: "RPT-1002",
          animalType: "Lion",
          incidentType: "Livestock Attack",
          location: "Kajiado North",
          description: "Two goats were killed near the grazing enclosure.",
          estimatedLoss: 500,
          evidenceName: "lion-attack.jpg",
          evidenceData: "",
          status: "verified",
          reporterId: "USR-MEMBER-002",
          reporterName: "Daniel Mwangi",
          createdAt: "2026-03-18T14:10:00.000Z",
          updatedAt: "2026-03-19T08:30:00.000Z"
        },
        {
          id: "RPT-1003",
          animalType: "Buffalo",
          incidentType: "Property Damage",
          location: "Laikipia West",
          description: "Fence and water tank were damaged by buffalo crossing.",
          estimatedLoss: 850,
          evidenceName: "buffalo-fence.png",
          evidenceData: "",
          status: "rejected",
          reporterId: "USR-MEMBER-001",
          reporterName: "Miriam Njeri",
          createdAt: "2026-03-16T10:12:00.000Z",
          updatedAt: "2026-03-17T11:40:00.000Z"
        },
        {
          id: "RPT-1004",
          animalType: "Hyena",
          incidentType: "Livestock Attack",
          location: "Baringo South",
          description: "Three sheep missing after a nighttime hyena raid.",
          estimatedLoss: 620,
          evidenceName: "hyena.jpg",
          evidenceData: "",
          status: "paid",
          reporterId: "USR-MEMBER-002",
          reporterName: "Daniel Mwangi",
          createdAt: "2026-03-13T06:45:00.000Z",
          updatedAt: "2026-03-23T10:00:00.000Z"
        },
        {
          id: "RPT-1005",
          animalType: "Leopard",
          incidentType: "Human Injury",
          location: "Isiolo Central",
          description: "Farmer sustained arm injuries while guarding livestock.",
          estimatedLoss: 1100,
          evidenceName: "injury-report.pdf",
          evidenceData: "",
          status: "pending",
          reporterId: "USR-MEMBER-001",
          reporterName: "Miriam Njeri",
          createdAt: "2026-03-24T19:05:00.000Z",
          updatedAt: "2026-03-24T19:05:00.000Z"
        }
      ]);
    }
  }

  window.WIRAM = {
    storageKeys: STORAGE_KEYS,
    getUsers: getUsers,
    setUsers: setUsers,
    getReports: getReports,
    setReports: setReports,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    clearCurrentUser: clearCurrentUser,
    setFlashMessage: setFlashMessage,
    consumeFlashMessage: consumeFlashMessage,
    createId: createId,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    normalizeRole: normalizeRole,
    normalizeStatus: normalizeStatus,
    normalizePaymentMode: normalizePaymentMode,
    normalizePaymentPhone: normalizePaymentPhone,
    normalizeBankAccount: normalizeBankAccount,
    validatePaymentDetails: validatePaymentDetails,
    formatPaymentDetails: formatPaymentDetails,
    syncPaymentDetailFields: syncPaymentDetailFields,
    formatPaymentMode: formatPaymentMode,
    getApiBaseUrl: getApiBaseUrl,
    isApiConfigured: isApiConfigured,
    isApiNetworkError: isApiNetworkError,
    apiRequest: apiRequest,
    loadReportsForCurrentUser: loadReportsForCurrentUser,
    loadReportsForAllUsers: loadReportsForAllUsers,
    loadUsersForAdmin: loadUsersForAdmin,
    loadDashboardData: loadDashboardData,
    loadReportDetail: loadReportDetail,
    submitRemoteReport: submitRemoteReport,
    updateRemoteReportStatus: updateRemoteReportStatus,
    updateRemoteReportPaymentMode: updateRemoteReportPaymentMode,
    updateRemoteUserRole: updateRemoteUserRole,
    updateRemotePaymentMode: updateRemotePaymentMode,
    savePaymentMode: savePaymentMode,
    loginRemoteUser: loginRemoteUser,
    registerRemoteUser: registerRemoteUser,
    logoutRemoteUser: logoutRemoteUser,
    verifyCurrentSession: verifyCurrentSession,
    seedMockData: seedMockData,
    shouldUseLocalData: shouldUseLocalData,
    isLocalDemoMode: isLocalDemoMode,
    showAlert: showAlert,
    showSpinner: showSpinner,
    hideSpinner: hideSpinner,
    populateSummaryCards: populateSummaryCards,
    renderStatusChart: renderStatusChart,
    getRoleHome: getRoleHome,
    openModal: openModal,
    closeModal: closeModal,
    refreshDashboardViews: refreshDashboardViews
  };

  document.addEventListener("DOMContentLoaded", async function () {
    if (shouldUseLocalData() || !getUsers().length) {
      seedMockData();
    }

    if (isApiConfigured()) {
      try {
        await verifyCurrentSession();
      } catch (_error) {
        clearCurrentUser();
      }
    }

    ensureUiContainers();
    enforceAccess();
    wireCommonUi();

    const flash = consumeFlashMessage();
    if (flash && flash.message) {
      showAlert(flash.message, flash.type || "success");
    }

    await refreshDashboardViews();
    await initManageUsersPage();
    initPaymentModeForm();
    initCompensationContactForms();
  });
})();


