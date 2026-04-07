(function () {
  "use strict";

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
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getRoleHome(role) {
    return ROLE_HOME[role] || "index.html";
  }

  // Inject alert and spinner containers once so each page can use them.
  function ensureUiContainers() {
    if (!document.getElementById("alertContainer")) {
      const alertContainer = document.createElement("div");
      alertContainer.id = "alertContainer";
      alertContainer.className = "alert-container";
      document.body.appendChild(alertContainer);
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

    if (roles.length > 0 && roles.indexOf(user.role) === -1) {
      setFlashMessage("You do not have permission to view that page.", "error");
      window.location.href = getRoleHome(user.role);
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
  function renderUsersTable() {
    const tableBody = document.getElementById("usersTableBody");
    if (!tableBody) {
      return;
    }

    const roleFilter = document.getElementById("usersRoleFilter");
    const selectedRole = roleFilter ? roleFilter.value : "all";
    const users = getUsers().slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const filtered =
      selectedRole === "all"
        ? users
        : users.filter(function (user) {
            return user.role === selectedRole;
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
          escapeHtml(user.role) +
          '">' +
          escapeHtml(user.role) +
          "</span></td>" +
          "<td>" +
          formatDate(user.createdAt) +
          "</td>" +
          "<td>" +
          '<select data-user-role="' +
          escapeHtml(user.id) +
          '">' +
          '<option value="member"' +
          (user.role === "member" ? " selected" : "") +
          ">Member</option>" +
          '<option value="officer"' +
          (user.role === "officer" ? " selected" : "") +
          ">Officer</option>" +
          '<option value="admin"' +
          (user.role === "admin" ? " selected" : "") +
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

  function initManageUsersPage() {
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
        const users = getUsers();
        const user = users.find(function (item) {
          return item.id === userId;
        });

        if (!user || !select) {
          showAlert("Unable to update that user.", "error");
          return;
        }

        user.role = select.value;
        setUsers(users);

        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === user.id) {
          currentUser.role = user.role;
          setCurrentUser(currentUser);
          setFlashMessage(
            "Your role was updated. You were redirected to the correct dashboard.",
            "info"
          );
          window.location.href = getRoleHome(currentUser.role);
          return;
        }

        showAlert("User role updated successfully.", "success");
        renderUsersTable();
      });
      tableBody.dataset.bound = "true";
    }

    renderUsersTable();
  }

  // Dashboard hydration for member, officer, and admin home pages.
  function refreshDashboardViews() {
    const page = document.body.dataset.page || "";
    const reports = getReports().slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    const user = getCurrentUser();

    if (!user) {
      return;
    }

    if (page === "dashboard") {
      const userReports = reports.filter(function (item) {
        return item.reporterId === user.id;
      });
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
      const users = getUsers();
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
          name: "Admin Peter Kamau",
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

  document.addEventListener("DOMContentLoaded", function () {
    seedMockData();
    ensureUiContainers();
    enforceAccess();
    wireCommonUi();

    const flash = consumeFlashMessage();
    if (flash && flash.message) {
      showAlert(flash.message, flash.type || "success");
    }

    refreshDashboardViews();
    initManageUsersPage();
  });
})();
