(function () {
  "use strict";

  // Basic email format check for login and registration forms.
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Creates a new user record in localStorage.
  function registerUser(payload) {
    const form = document.getElementById("registerForm");
    const data = payload || (form ? new FormData(form) : null);
    if (!data) {
      return false;
    }

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    const role = String(data.get("role") || "member");

    if (name.length < 2) {
      window.WIRAM.showAlert("Please enter your full name.", "error");
      return false;
    }

    if (!validateEmail(email)) {
      window.WIRAM.showAlert("Please enter a valid email address.", "error");
      return false;
    }

    if (password.length < 6) {
      window.WIRAM.showAlert("Password must have at least 6 characters.", "error");
      return false;
    }

    if (confirmPassword && password !== confirmPassword) {
      window.WIRAM.showAlert("Passwords do not match.", "error");
      return false;
    }

    const allowedRoles = ["member", "officer", "admin"];
    if (allowedRoles.indexOf(role) === -1) {
      window.WIRAM.showAlert("Please choose a valid role.", "error");
      return false;
    }

    const users = window.WIRAM.getUsers();
    const emailExists = users.some(function (user) {
      return user.email.toLowerCase() === email;
    });

    if (emailExists) {
      window.WIRAM.showAlert("That email is already registered.", "error");
      return false;
    }

    users.push({
      id: window.WIRAM.createId("USR"),
      name: name,
      email: email,
      password: password,
      role: role,
      createdAt: new Date().toISOString()
    });
    window.WIRAM.setUsers(users);

    window.WIRAM.setFlashMessage("Registration successful. Please log in.", "success");
    window.location.href = "login.html";
    return true;
  }

  // Authenticates users from localStorage and creates a lightweight session object.
  function loginUser(payload) {
    const form = document.getElementById("loginForm");
    const data = payload || (form ? new FormData(form) : null);
    if (!data) {
      return false;
    }

    const email = String(data.get("email") || "").trim().toLowerCase();
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

    const users = window.WIRAM.getUsers();
    const found = users.find(function (user) {
      return user.email.toLowerCase() === email && user.password === password;
    });

    if (!found) {
      window.WIRAM.hideSpinner();
      window.WIRAM.showAlert("Invalid email or password.", "error");
      return false;
    }

    const sessionUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role
    };

    window.setTimeout(function () {
      window.WIRAM.setCurrentUser(sessionUser);
      window.WIRAM.hideSpinner();
      window.WIRAM.setFlashMessage(
        "Welcome back, " + found.name + ".",
        "success"
      );
      window.location.href = window.WIRAM.getRoleHome(found.role);
    }, 500);

    return true;
  }

  // Ends session and returns user to login page.
  function logoutUser() {
    window.WIRAM.clearCurrentUser();
    window.WIRAM.setFlashMessage("You have logged out successfully.", "info");
    window.location.href = "login.html";
  }

  // Binds form submit handlers once per page load.
  function bindAuthForms() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm && !loginForm.dataset.bound) {
      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        loginUser();
      });
      loginForm.dataset.bound = "true";
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm && !registerForm.dataset.bound) {
      registerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        registerUser();
      });
      registerForm.dataset.bound = "true";
    }
  }

  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;

  document.addEventListener("DOMContentLoaded", bindAuthForms);
})();
