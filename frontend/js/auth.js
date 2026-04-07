(function () {
  "use strict";

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function getApiEnabled() {
    return Boolean(window.WIRAM && window.WIRAM.isApiConfigured && window.WIRAM.isApiConfigured());
  }

  async function fallbackRegister(name, email, password) {
    const users = window.WIRAM.getUsers();
    if (users.some(function (user) { return String(user.email || "").toLowerCase() === email; })) {
      window.WIRAM.showAlert("That email is already registered.", "error");
      return null;
    }

    const createdUser = {
      id: window.WIRAM.createId("USR"),
      name: name,
      email: email,
      password: password,
      role: "member",
      createdAt: new Date().toISOString()
    };
    users.push(createdUser);
    window.WIRAM.setUsers(users);
    return createdUser;
  }

  async function registerUser(payload) {
    const form = document.getElementById("registerForm");
    const data = payload || (form ? new FormData(form) : null);
    if (!data) {
      return false;
    }

    const name = normalizeText(data.get("name"));
    const email = normalizeText(data.get("email")).toLowerCase();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (name.length < 2) {
      window.WIRAM.showAlert("Please enter your full name.", "error");
      return false;
    }

    if (!validateEmail(email)) {
      window.WIRAM.showAlert("Please enter a valid email address.", "error");
      return false;
    }

    if (password.length < 8) {
      window.WIRAM.showAlert("Password must have at least 8 characters.", "error");
      return false;
    }

    if (confirmPassword && password !== confirmPassword) {
      window.WIRAM.showAlert("Passwords do not match.", "error");
      return false;
    }

    window.WIRAM.showSpinner();
    try {
      let authResult;
      if (getApiEnabled()) {
        authResult = await window.WIRAM.registerRemoteUser({
          name: name,
          email: email,
          password: password
        });
      } else {
        const created = await fallbackRegister(name, email, password);
        if (!created) {
          return false;
        }
        authResult = {
          token: "",
          expiresAt: null,
          user: {
            id: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
            token: "",
            expiresAt: null
          }
        };
      }

      const sessionUser = authResult.user;
      window.WIRAM.setCurrentUser(sessionUser);
      window.WIRAM.setFlashMessage("Registration successful. Welcome, " + sessionUser.name + ".", "success");
      window.location.href = window.WIRAM.getRoleHome(sessionUser.role);
      return true;
    } catch (error) {
      if (getApiEnabled()) {
        try {
          const created = await fallbackRegister(name, email, password);
          if (created) {
            window.WIRAM.setFlashMessage("Registration successful. Please log in.", "success");
            window.location.href = "login.html";
            return true;
          }
        } catch (_fallbackError) {
          // Fall through to the error below.
        }
      }

      window.WIRAM.showAlert(error.message || "Unable to register at this time.", "error");
      return false;
    } finally {
      window.WIRAM.hideSpinner();
    }
  }

  async function fallbackLogin(email, password) {
    const users = window.WIRAM.getUsers();
    const found = users.find(function (user) {
      return String(user.email || "").toLowerCase() === email && user.password === password;
    });

    if (!found) {
      return null;
    }

    return {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      token: "",
      expiresAt: null
    };
  }

  async function loginUser(payload) {
    const form = document.getElementById("loginForm");
    const data = payload || (form ? new FormData(form) : null);
    if (!data) {
      return false;
    }

    const email = normalizeText(data.get("email")).toLowerCase();
    const password = String(data.get("password") || "");

    if (!validateEmail(email)) {
      window.WIRAM.showAlert("Enter a valid email address.", "error");
      return false;
    }

    if (!password) {
      window.WIRAM.showAlert("Password is required.", "error");
      return false;
    }

    window.WIRAM.showSpinner();
    try {
      let sessionUser = null;

      if (getApiEnabled()) {
        const authResult = await window.WIRAM.loginRemoteUser({ email: email, password: password });
        sessionUser = authResult.user;
      } else {
        sessionUser = await fallbackLogin(email, password);
      }

      if (!sessionUser) {
        window.WIRAM.showAlert("Invalid email or password.", "error");
        return false;
      }

      window.WIRAM.setCurrentUser(sessionUser);
      window.WIRAM.setFlashMessage("Welcome back, " + sessionUser.name + ".", "success");
      window.location.href = window.WIRAM.getRoleHome(sessionUser.role);
      return true;
    } catch (error) {
      const fallbackUser = await fallbackLogin(email, password);
      if (fallbackUser) {
        window.WIRAM.setCurrentUser(fallbackUser);
        window.WIRAM.setFlashMessage("Welcome back, " + fallbackUser.name + ".", "success");
        window.location.href = window.WIRAM.getRoleHome(fallbackUser.role);
        return true;
      }

      window.WIRAM.showAlert(error.message || "Invalid email or password.", "error");
      return false;
    } finally {
      window.WIRAM.hideSpinner();
    }
  }

  async function logoutUser() {
    try {
      if (getApiEnabled()) {
        await window.WIRAM.logoutRemoteUser();
      }
    } catch (_error) {
      // Logout should still complete locally even if the remote call fails.
    } finally {
      window.WIRAM.clearCurrentUser();
      window.WIRAM.setFlashMessage("You have logged out successfully.", "info");
      window.location.href = "login.html";
    }
  }

  function bindAuthForms() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm && !loginForm.dataset.bound) {
      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        void loginUser();
      });
      loginForm.dataset.bound = "true";
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm && !registerForm.dataset.bound) {
      registerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        void registerUser();
      });
      registerForm.dataset.bound = "true";
    }
  }

  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;

  document.addEventListener("DOMContentLoaded", bindAuthForms);
})();
