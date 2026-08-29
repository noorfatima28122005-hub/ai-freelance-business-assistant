/* =========================================================
   AI FREELANCE BUSINESS ASSISTANT
   Frontend Application
========================================================= */

const API_URL = "http://localhost:3001";

let token = localStorage.getItem("token") || "";
let currentUser = null;


/* =========================================================
   DOM HELPERS
========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = getElement(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function showElement(id) {
  const element = getElement(id);

  if (element) {
    element.classList.remove("hidden");
  }
}

function hideElement(id) {
  const element = getElement(id);

  if (element) {
    element.classList.add("hidden");
  }
}


/* =========================================================
   AUTH MESSAGE
========================================================= */

function showAuthMessage(message, type = "error") {
  const element = getElement("authMessage");

  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = "auth-message " + type;
  element.classList.remove("hidden");
}

function hideAuthMessage() {
  const element = getElement("authMessage");

  if (!element) {
    return;
  }

  element.textContent = "";
  element.className = "auth-message hidden";
}


/* =========================================================
   AUTH MODE
========================================================= */

function showLoginMode() {
  hideElement("signupForm");
  showElement("loginForm");

  setText("authTitle", "Welcome back");

  setText(
    "authSubtitle",
    "Sign in to manage your freelance business."
  );

  setText(
    "authSwitchText",
    "Don't have an account?"
  );

  setText(
    "authSwitchButton",
    "Create account"
  );

  hideAuthMessage();
}

function showSignupMode() {
  hideElement("loginForm");
  showElement("signupForm");

  setText("authTitle", "Create your account");

  setText(
    "authSubtitle",
    "Start managing your freelance business with AI."
  );

  setText(
    "authSwitchText",
    "Already have an account?"
  );

  setText(
    "authSwitchButton",
    "Sign in"
  );

  hideAuthMessage();
}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  let response;

  try {
    response = await fetch(
      API_URL + endpoint,
      {
        ...options,
        headers
      }
    );
  } catch (error) {
    console.error("Network error:", error);

    throw new Error(
      "Unable to connect to the backend. Make sure the API server is running on port 3000."
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    if (
      response.status === 401 ||
      response.status === 403
    ) {
      token = "";
      currentUser = null;
      localStorage.removeItem("token");
    }

    throw new Error(
      data.message ||
      data.error ||
      "Request failed with status " + response.status
    );
  }

  return data;
}


/* =========================================================
   LOGIN
========================================================= */

async function login(email, password) {
  const button = getElement("loginButton");

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Signing in...";
    }

    const data = await apiRequest(
      "/api/auth/login",
      {
        method: "POST",

        body: JSON.stringify({
          email: email,
          password: password
        })
      }
    );

    console.log("Login response:", data);

    if (!data.token) {
      throw new Error(
        data.message ||
        "Login succeeded but no authentication token was received."
      );
    }

    token = data.token;

    localStorage.setItem(
      "token",
      token
    );

    const profileLoaded = await loadProfile();

    if (!profileLoaded) {
      throw new Error(
        "Login succeeded, but the user profile could not be loaded."
      );
    }

    await showApp();

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    showAuthMessage(
      error.message ||
      "Login failed. Please check your email and password.",
      "error"
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Sign In";
    }
  }
}


/* =========================================================
   SIGNUP
========================================================= */

async function signup(name, email, password) {
  const button = getElement("signupButton");

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Creating account...";
    }

    const data = await apiRequest(
      "/api/auth/signup",
      {
        method: "POST",

        body: JSON.stringify({
          name: name,
          email: email,
          password: password
        })
      }
    );

    console.log("Signup response:", data);

    if (!data.token) {
      throw new Error(
        data.message ||
        "Account created but no authentication token was received."
      );
    }

    token = data.token;

    localStorage.setItem(
      "token",
      token
    );

    const profileLoaded = await loadProfile();

    if (!profileLoaded) {
      throw new Error(
        "Account created, but the user profile could not be loaded."
      );
    }

    await showApp();

  } catch (error) {
    console.error(
      "Signup error:",
      error
    );

    showAuthMessage(
      error.message ||
      "Signup failed. Please try again.",
      "error"
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  }
}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {
  if (!token) {
    return false;
  }

  try {
    const data = await apiRequest(
      "/api/auth/profile",
      {
        method: "GET"
      }
    );

    console.log("Profile response:", data);

    currentUser =
      data.user ||
      data;

    if (!currentUser) {
      throw new Error(
        "No user profile received."
      );
    }

    updateUserUI(currentUser);

    return true;

  } catch (error) {
    console.error(
      "Profile error:",
      error
    );

    token = "";
    currentUser = null;

    localStorage.removeItem(
      "token"
    );

    return false;
  }
}


/* =========================================================
   UPDATE USER UI
========================================================= */

function updateUserUI(user) {
  const name =
    user && user.name
      ? user.name
      : "User";

  const email =
    user && user.email
      ? user.email
      : "—";

  setText(
    "sidebarUserName",
    name
  );

  setText(
    "topUserName",
    name
  );

  setText(
    "topUserEmail",
    email
  );

  const initial =
    String(name)
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  setText(
    "userInitial",
    initial
  );

  setText(
    "welcomeName",
    "👋 " + name
  );
}


/* =========================================================
   SHOW APP
========================================================= */

async function showApp() {
  hideElement("authScreen");

  showElement("appScreen");

  showElement("appFooter");

  if (currentUser) {
    updateUserUI(currentUser);
  }

  await checkConnection();

  await loadDashboard();
}


/* =========================================================
   SHOW AUTH
========================================================= */

function showAuth() {
  showElement("authScreen");

  hideElement("appScreen");

  hideElement("appFooter");

  showLoginMode();
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {
  token = "";
  currentUser = null;

  localStorage.removeItem(
    "token"
  );

  const assistantMessages =
    getElement(
      "assistantMessages"
    );

  if (assistantMessages) {
    assistantMessages.innerHTML = `
      <div class="assistant-message">

        <div class="message-avatar">
          AI
        </div>

        <div class="message-content">

          <strong>
            AI Assistant
          </strong>

          <p>
            Hello! I can help you understand your freelance business.
          </p>

          <p>
            Try asking:
          </p>

          <em>
            "Give me a summary of my freelance business."
          </em>

          <br>

          <em>
            "What should I focus on next?"
          </em>

        </div>

      </div>
    `;
  }

  showAuth();
}


/* =========================================================
   CONNECTION CHECK
========================================================= */

async function checkConnection() {
  try {
    const response = await fetch(
      API_URL + "/"
    );

    if (!response.ok) {
      throw new Error(
        "Backend unavailable"
      );
    }

    setText(
      "connectionText",
      "API Connected"
    );

    setText(
      "topConnectionText",
      "Connected"
    );

    setText(
      "apiStatus",
      "Connected successfully to the backend API."
    );

    const sidebarDot =
      getElement(
        "sidebarStatusDot"
      );

    const topDot =
      getElement(
        "topStatusDot"
      );

    if (sidebarDot) {
      sidebarDot.className =
        "status-dot connected";
    }

    if (topDot) {
      topDot.className =
        "status-dot connected";
    }

    return true;

  } catch (error) {
    console.error(
      "Connection error:",
      error
    );

    setText(
      "connectionText",
      "API Offline"
    );

    setText(
      "topConnectionText",
      "Offline"
    );

    setText(
      "apiStatus",
      "Unable to connect to the backend API."
    );

    const sidebarDot =
      getElement(
        "sidebarStatusDot"
      );

    const topDot =
      getElement(
        "topStatusDot"
      );

    if (sidebarDot) {
      sidebarDot.className =
        "status-dot error";
    }

    if (topDot) {
      topDot.className =
        "status-dot error";
    }

    return false;
  }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  try {
    const data =
      await apiRequest(
        "/api/dashboard"
      );

    console.log(
      "Dashboard response:",
      data
    );

    const summary =
      data.businessSummary ||
      data.summary ||
      data;

    setText(
      "totalClients",
      summary.totalClients ?? 0
    );

    setText(
      "totalProjects",
      summary.totalProjects ?? 0
    );

    setText(
      "totalTasks",
      summary.totalTasks ?? 0
    );

    const pending =
      summary.pendingTasks ??
      summary.pending ??
      0;

    const inProgress =
      summary.inProgressTasks ??
      summary.inProgress ??
      0;

    const completed =
      summary.completedTasks ??
      summary.completed ??
      0;

    setText(
      "pendingTasks",
      pending
    );

    setText(
      "inProgressTasks",
      inProgress
    );

    setText(
      "completedTasks",
      completed
    );

    setText(
      "completedProgressTasks",
      completed
    );

    const total =
      Number(
        summary.totalTasks ?? 0
      );

    updateProgress(
      "pendingProgress",
      pending,
      total
    );

    updateProgress(
      "inProgressProgress",
      inProgress,
      total
    );

    updateProgress(
      "completedProgress",
      completed,
      total
    );

    if (Array.isArray(data.tasks)) {
      renderUpcomingTasks(
        data.tasks
      );
    }

  } catch (error) {
    console.error(
      "Dashboard error:",
      error
    );

    const message =
      String(
        error.message || ""
      ).toLowerCase();

    if (
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("token")
    ) {
      logout();
    }
  }
}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress(
  elementId,
  value,
  total
) {
  const element =
    getElement(
      elementId
    );

  if (!element) {
    return;
  }

  if (
    !total ||
    total <= 0
  ) {
    element.style.width = "0%";
    return;
  }

  const percentage =
    Math.min(
      100,
      Math.round(
        (
          Number(value) /
          Number(total)
        ) * 100
      )
    );

  element.style.width =
    percentage + "%";
}


/* =========================================================
   CLIENTS
========================================================= */

async function loadClients() {
  const container =
    getElement(
      "clientsContainer"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    `<p class="loading-text">Loading clients...</p>`;

  try {
    const data =
      await apiRequest(
        "/api/clients"
      );

    const clients =
      Array.isArray(data)
        ? data
        : data.clients || [];

    if (!clients.length) {
      container.innerHTML =
        `<div class="empty-state">
          No clients found.
        </div>`;

      return;
    }

    container.innerHTML =
      clients
        .map(
          function (client) {
            return `
              <div class="client-card">

                <h3>
                  ${escapeHTML(
                    client.name ||
                    "Unnamed Client"
                  )}
                </h3>

                <p>
                  ${escapeHTML(
                    client.email ||
                    "No email provided"
                  )}
                </p>

                ${
                  client.phone
                    ? `
                      <p>
                        Phone:
                        ${escapeHTML(
                          client.phone
                        )}
                      </p>
                    `
                    : ""
                }

                ${
                  client.company
                    ? `
                      <p>
                        Company:
                        ${escapeHTML(
                          client.company
                        )}
                      </p>
                    `
                    : ""
                }

                ${
                  client.notes
                    ? `
                      <p>
                        ${escapeHTML(
                          client.notes
                        )}
                      </p>
                    `
                    : ""
                }

              </div>
            `;
          }
        )
        .join("");

  } catch (error) {
    console.error(
      "Clients error:",
      error
    );

    container.innerHTML =
      `<div class="empty-state">
        Unable to load clients.
      </div>`;
  }
}


/* =========================================================
   PROJECTS
========================================================= */

async function loadProjects() {
  const container =
    getElement(
      "projectsContainer"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    `<p class="loading-text">Loading projects...</p>`;

  try {
    const data =
      await apiRequest(
        "/api/projects"
      );

    const projects =
      Array.isArray(data)
        ? data
        : data.projects || [];

    if (!projects.length) {
      container.innerHTML =
        `<div class="empty-state">
          No projects found.
        </div>`;

      return;
    }

    container.innerHTML =
      projects
        .map(
          function (project) {
            return `
              <div class="project-card">

                <h3>
                  ${escapeHTML(
                    project.name ||
                    "Unnamed Project"
                  )}
                </h3>

                <p>
                  ${escapeHTML(
                    project.description ||
                    "No description provided."
                  )}
                </p>

                <p>
                  Client:
                  <strong>
                    ${escapeHTML(
                      project.client_name ||
                      "N/A"
                    )}
                  </strong>
                </p>

                <p>
                  Status:
                  <strong>
                    ${escapeHTML(
                      project.status ||
                      "N/A"
                    )}
                  </strong>
                </p>

                <p>
                  Deadline:
                  <strong>
                    ${escapeHTML(
                      project.deadline ||
                      "N/A"
                    )}
                  </strong>
                </p>

              </div>
            `;
          }
        )
        .join("");

  } catch (error) {
    console.error(
      "Projects error:",
      error
    );

    container.innerHTML =
      `<div class="empty-state">
        Unable to load projects.
      </div>`;
  }
}


/* =========================================================
   TASKS
========================================================= */

async function loadTasks() {
  const container =
    getElement(
      "tasksContainer"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    `<p class="loading-text">Loading tasks...</p>`;

  try {
    const data =
      await apiRequest(
        "/api/tasks"
      );

    const tasks =
      Array.isArray(data)
        ? data
        : data.tasks || [];

    if (!tasks.length) {
      container.innerHTML =
        `<div class="empty-state">
          No tasks found.
        </div>`;

      renderUpcomingTasks([]);

      return;
    }

    renderTasks(tasks);

    renderUpcomingTasks(tasks);

  } catch (error) {
    console.error(
      "Tasks error:",
      error
    );

    container.innerHTML =
      `<div class="empty-state">
        Unable to load tasks.
      </div>`;
  }
}


/* =========================================================
   RENDER TASKS
========================================================= */

function renderTasks(tasks) {
  const container =
    getElement(
      "tasksContainer"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    tasks
      .map(
        function (task) {
          return `
            <div class="task-card">

              <h3>
                ${escapeHTML(
                  task.title ||
                  "Untitled Task"
                )}
              </h3>

              <p>
                ${escapeHTML(
                  task.description ||
                  "No description provided."
                )}
              </p>

              <p>
                Status:
                <strong>
                  ${escapeHTML(
                    task.status ||
                    "N/A"
                  )}
                </strong>
              </p>

              <p>
                Priority:
                <strong>
                  ${escapeHTML(
                    task.priority ||
                    "N/A"
                  )}
                </strong>
              </p>

              <p>
                Deadline:
                <strong>
                  ${escapeHTML(
                    task.deadline ||
                    "N/A"
                  )}
                </strong>
              </p>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   UPCOMING TASKS
========================================================= */

function renderUpcomingTasks(tasks) {
  const container =
    getElement(
      "upcomingTasksContainer"
    );

  if (!container) {
    return;
  }

  const upcoming =
    tasks.filter(
      function (task) {
        const status =
          String(
            task.status || ""
          ).toLowerCase();

        return (
          status !== "completed" &&
          task.deadline
        );
      }
    );

  if (!upcoming.length) {
    container.innerHTML =
      `<div class="empty-state">
        No upcoming tasks.
      </div>`;

    return;
  }

  container.innerHTML =
    upcoming
      .map(
        function (task) {
          return `
            <div class="task-card">

              <h3>
                ${escapeHTML(
                  task.title ||
                  "Untitled Task"
                )}
              </h3>

              <p>
                Deadline:
                <strong>
                  ${escapeHTML(
                    task.deadline
                  )}
                </strong>
              </p>

              <p>
                Status:
                <strong>
                  ${escapeHTML(
                    task.status ||
                    "N/A"
                  )}
                </strong>
              </p>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   AI ASSISTANT
========================================================= */

async function askAI(message) {
  const container =
    getElement(
      "assistantMessages"
    );

  const button =
    getElement(
      "assistantButton"
    );

  if (!container) {
    return;
  }

  const userMessage =
    document.createElement(
      "div"
    );

  userMessage.className =
    "assistant-message user-message";

  userMessage.innerHTML = `
    <div class="message-avatar">
      You
    </div>

    <div class="message-content">

      <strong>
        You
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>
  `;

  container.appendChild(
    userMessage
  );

  container.scrollTop =
    container.scrollHeight;

  if (button) {
    button.disabled = true;
    button.textContent =
      "Thinking...";
  }

  try {
    const data =
      await apiRequest(
        "/api/assistant",
        {
          method: "POST",

          body: JSON.stringify({
            message: message
          })
        }
      );

    const response =
      data.response ||
      data.answer ||
      data.message ||
      "No response received.";

    const aiMessage =
      document.createElement(
        "div"
      );

    aiMessage.className =
      "assistant-message";

    aiMessage.innerHTML = `
      <div class="message-avatar">
        AI
      </div>

      <div class="message-content">

        <strong>
          AI Assistant
        </strong>

        <p>
          ${escapeHTML(response)}
        </p>

      </div>
    `;

    container.appendChild(
      aiMessage
    );

    container.scrollTop =
      container.scrollHeight;

  } catch (error) {
    console.error(
      "AI Assistant error:",
      error
    );

    const errorMessage =
      document.createElement(
        "div"
      );

    errorMessage.className =
      "assistant-message";

    errorMessage.innerHTML = `
      <div class="message-avatar">
        AI
      </div>

      <div class="message-content">

        <strong>
          AI Assistant
        </strong>

        <p>
          ${escapeHTML(
            error.message ||
            "Sorry, I could not process your request."
          )}
        </p>

      </div>
    `;

    container.appendChild(
      errorMessage
    );

    container.scrollTop =
      container.scrollHeight;

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "Ask AI";
    }
  }
}


/* =========================================================
   EVENT SETUP
========================================================= */

function setupEvents() {

  /* -----------------------------------------------
     AUTH SWITCH
  ------------------------------------------------ */

  const authSwitchButton =
    getElement(
      "authSwitchButton"
    );

  if (authSwitchButton) {
    authSwitchButton.addEventListener(
      "click",
      function () {

        const loginForm =
          getElement(
            "loginForm"
          );

        if (
          loginForm &&
          !loginForm.classList.contains(
            "hidden"
          )
        ) {
          showSignupMode();
        } else {
          showLoginMode();
        }
      }
    );
  }


  /* -----------------------------------------------
     LOGIN
  ------------------------------------------------ */

  const loginForm =
    getElement(
      "loginForm"
    );

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();

        const emailInput =
          getElement(
            "loginEmail"
          );

        const passwordInput =
          getElement(
            "loginPassword"
          );

        const email =
          emailInput
            ? emailInput.value.trim()
            : "";

        const password =
          passwordInput
            ? passwordInput.value
            : "";

        if (!email || !password) {
          showAuthMessage(
            "Please enter your email and password.",
            "error"
          );

          return;
        }

        await login(
          email,
          password
        );
      }
    );
  }


  /* -----------------------------------------------
     SIGNUP
  ------------------------------------------------ */

  const signupForm =
    getElement(
      "signupForm"
    );

  if (signupForm) {
    signupForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();

        const nameInput =
          getElement(
            "signupName"
          );

        const emailInput =
          getElement(
            "signupEmail"
          );

        const passwordInput =
          getElement(
            "signupPassword"
          );

        const name =
          nameInput
            ? nameInput.value.trim()
            : "";

        const email =
          emailInput
            ? emailInput.value.trim()
            : "";

        const password =
          passwordInput
            ? passwordInput.value
            : "";

        if (
          !name ||
          !email ||
          !password
        ) {
          showAuthMessage(
            "Please complete all fields.",
            "error"
          );

          return;
        }

        if (password.length < 6) {
          showAuthMessage(
            "Password must be at least 6 characters long.",
            "error"
          );

          return;
        }

        await signup(
          name,
          email,
          password
        );
      }
    );
  }


  /* -----------------------------------------------
     LOGOUT
  ------------------------------------------------ */

  const logoutButton =
    getElement(
      "logoutButton"
    );

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      logout
    );
  }


  /* -----------------------------------------------
     REFRESH
  ------------------------------------------------ */

  const refreshButton =
    getElement(
      "refreshDashboard"
    );

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      async function () {

        refreshButton.disabled =
          true;

        refreshButton.textContent =
          "Refreshing...";

        try {
          await checkConnection();
          await loadDashboard();

        } finally {
          refreshButton.disabled =
            false;

          refreshButton.textContent =
            "↻ Refresh";
        }
      }
    );
  }


  /* -----------------------------------------------
     CLIENTS
  ------------------------------------------------ */

  const clientsButton =
    getElement(
      "loadClients"
    );

  if (clientsButton) {
    clientsButton.addEventListener(
      "click",
      loadClients
    );
  }


  /* -----------------------------------------------
     PROJECTS
  ------------------------------------------------ */

  const projectsButton =
    getElement(
      "loadProjects"
    );

  if (projectsButton) {
    projectsButton.addEventListener(
      "click",
      loadProjects
    );
  }


  /* -----------------------------------------------
     TASKS
  ------------------------------------------------ */

  const tasksButton =
    getElement(
      "loadTasks"
    );

  if (tasksButton) {
    tasksButton.addEventListener(
      "click",
      loadTasks
    );
  }


  /* -----------------------------------------------
     AI FORM
  ------------------------------------------------ */

  const assistantForm =
    getElement(
      "assistantForm"
    );

  if (assistantForm) {
    assistantForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();

        const input =
          getElement(
            "assistantInput"
          );

        if (!input) {
          return;
        }

        const message =
          input.value.trim();

        if (!message) {
          return;
        }

        input.value = "";

        await askAI(
          message
        );
      }
    );
  }


  /* -----------------------------------------------
     NAV ACTIVE STATE
  ------------------------------------------------ */

  const navLinks =
    document.querySelectorAll(
      ".nav-link"
    );

  navLinks.forEach(
    function (link) {

      link.addEventListener(
        "click",
        function () {

          navLinks.forEach(
            function (item) {
              item.classList.remove(
                "active"
              );
            }
          );

          link.classList.add(
            "active"
          );
        }
      );
    }
  );
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    console.log(
      "Frontend app initialized."
    );

    setupEvents();

    if (token) {

      console.log(
        "Existing token found. Verifying..."
      );

      const profileLoaded =
        await loadProfile();

      if (profileLoaded) {
        await showApp();
        return;
      }
    }

    showAuth();
  }
);
