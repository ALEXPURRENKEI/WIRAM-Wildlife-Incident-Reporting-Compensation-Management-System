(function () {
  "use strict";

  window.WIRAM_CONFIG = window.WIRAM_CONFIG || {};
  if (!window.WIRAM_CONFIG.API_BASE_URL) {
    window.WIRAM_CONFIG.API_BASE_URL =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:8082"
        : "https://wiram-spring-backend.onrender.com";
  }

  // Centralized localStorage keys used across the whole application.
  const STORAGE_KEYS = {
    users: "wiram_users",
    reports: "wiram_reports",
    session: "wiram_session",
    flash: "wiram_flash"
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
    return Boolean(getApiBaseUrl());
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

    const response = await fetch(getApiBaseUrl() + path, {
      method: requestOptions.method || "GET",
      headers: headers,
      body: body
    });

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

  async function loadReportsForCurrentUser() {
    const currentUser = getCurrentUser();
    if (!isApiConfigured()) {
      const reports = getReports();
      if (!currentUser) {
        return [];
      }

      if (normalizeRole(currentUser.role) === "member") {
        return reports.filter(function (report) {
          return report.reporterId === currentUser.id;
        });
      }

      return reports;
    }

    if (!currentUser) {
      return [];
    }

    const endpoint = currentUser.role === "member" ? "/api/reports/my" : "/api/reports";
    const payload = await apiRequest(endpoint);
    const reports = Array.isArray(payload) ? payload.map(normalizeReportRecord) : [];
    return reports;
  }

  async function loadReportsForAllUsers() {
    if (!isApiConfigured()) {
      return getReports();
    }

    const payload = await apiRequest("/api/reports");
    const reports = Array.isArray(payload) ? payload.map(normalizeReportRecord) : [];
    return reports;
  }

  async function loadUsersForAdmin() {
    if (!isApiConfigured()) {
      return getUsers();
    }

    const payload = await apiRequest("/api/users");
    const users = Array.isArray(payload) ? payload.map(normalizeUserRecord) : [];
    return users;
  }

  async function loadReportDetail(reportId) {
    if (!isApiConfigured()) {
      const report = getReports().find(function (item) {
        return item.id === reportId;
      });
      if (!report) {
        throw new Error("Report not found.");
      }
      return report;
    }

    const payload = await apiRequest("/api/reports/" + encodeURIComponent(reportId));
    const detail = normalizeReportRecord(payload);
    if (payload && Array.isArray(payload.history)) {
      detail.history = payload.history.map(function (history) {
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
    return normalizeReportRecord(response.report);
  }

  async function updateRemoteReportStatus(reportId, status, notes) {
    const response = await apiRequest("/api/reports/" + encodeURIComponent(reportId) + "/status", {
      method: "PATCH",
      body: JSON.stringify({
        status: String(status || "").toUpperCase(),
        notes: notes || ""
      })
    });
    return normalizeReportRecord(response);
  }

  async function updateRemoteUserRole(userId, role) {
    const response = await apiRequest("/api/users/" + encodeURIComponent(userId) + "/role", {
      method: "PATCH",
      body: JSON.stringify({
        role: String(role || "").toUpperCase()
      })
    });
    return normalizeUserRecord(response);
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
      const session = normalizeSessionUser(response, currentUser.token, currentUser.expiresAt);
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
    try {
      reports = await loadReportsForCurrentUser();
    } catch (error) {
      if (!reports.length) {
        showAlert(error.message || "Unable to load reports.", "error");
        return;
      }
    }

    reports = reports.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (page === "dashboard") {
      const userReports = reports.slice();
      populateSummaryCards(userReports);
      renderStatusChart("memberChart", userReports);

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
      populateSummaryCards(reports);
      renderStatusChart("officerChart", reports);

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
      populateSummaryCards(reports);
      let users = getUsers();
      try {
        users = await loadUsersForAdmin();
      } catch (_error) {
        users = users || [];
      }
      const userCount = document.getElementById("totalUsersCount");
      if (userCount) {
        userCount.textContent = String(users.length);
      }
      renderStatusChart("adminChart", reports);

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
          createdAt: "2026-02-06T09:00:00.000Z"
        },
        {
          id: "USR-MEMBER-002",
          name: "Daniel Mwangi",
          email: "community@wiram.org",
          password: "password123",
          role: "member",
          createdAt: "2026-02-11T09:00:00.000Z"
        },
        {
          id: "USR-OFFICER-001",
          name: "Officer Grace Otieno",
          email: "officer@wiram.org",
          password: "password123",
          role: "officer",
          createdAt: "2026-01-28T09:00:00.000Z"
        },
        {
          id: "USR-ADMIN-001",
          name: "Admin Alex Pure",
          email: "admin@wiram.org",
          password: "password123",
          role: "admin",
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
    getApiBaseUrl: getApiBaseUrl,
    isApiConfigured: isApiConfigured,
    apiRequest: apiRequest,
    loadReportsForCurrentUser: loadReportsForCurrentUser,
    loadReportsForAllUsers: loadReportsForAllUsers,
    loadUsersForAdmin: loadUsersForAdmin,
    loadReportDetail: loadReportDetail,
    submitRemoteReport: submitRemoteReport,
    updateRemoteReportStatus: updateRemoteReportStatus,
    updateRemoteUserRole: updateRemoteUserRole,
    loginRemoteUser: loginRemoteUser,
    registerRemoteUser: registerRemoteUser,
    logoutRemoteUser: logoutRemoteUser,
    verifyCurrentSession: verifyCurrentSession,
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
    if (isApiConfigured()) {
      try {
        await verifyCurrentSession();
      } catch (_error) {
        clearCurrentUser();
      }
    } else {
      seedMockData();
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
  });
})();
