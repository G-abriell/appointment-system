(() => {
  const STORAGE_KEYS = Object.freeze({
    users: "jhab_users",
    session: "jhab_session",
    services: "jhab_services",
    barbers: "jhab_barbers",
    bookings: "jhab_bookings",
    hours: "jhab_hours",
    redirect: "jhab_redirect",
    pendingBooking: "jhab_pending_booking"
  });

  const ADMIN_USER = Object.freeze({
    id: "admin-fixed",
    name: "Rebouças Barbearia",
    email: "admin@barbearia.com",
    password: "admin123",
    isAdmin: true
  });

  const DEFAULT_SERVICES = Object.freeze([
    { id: 1, name: "Barba + Desondulação", duration: 60, price: 55 },
    { id: 2, name: "Corte Degradê", duration: 45, price: 45 },
    { id: 3, name: "Corte + Barba", duration: 75, price: 70 },
    { id: 4, name: "Sobrancelha", duration: 20, price: 20 }
  ]);

  const DEFAULT_BARBER_SPECIALTY = "Acabamento preciso no padrão da barbearia.";
  const DEFAULT_BARBERS = Object.freeze([
    {
      id: 1,
      name: "Gabriell",
      rating: 5.0,
      specialty: DEFAULT_BARBER_SPECIALTY,
      photo: "assets/portrait-gabriell.svg"
    },
    {
      id: 2,
      name: "Manuelly",
      rating: 4.9,
      specialty: DEFAULT_BARBER_SPECIALTY,
      photo: "assets/portrait-manuelly.svg"
    },
    {
      id: 3,
      name: "João",
      rating: 4.8,
      specialty: DEFAULT_BARBER_SPECIALTY,
      photo: "assets/portrait-joao.svg"
    }
  ]);
  const DEFAULT_BARBERS_BY_ID = Object.freeze(
    Object.fromEntries(DEFAULT_BARBERS.map((barber) => [barber.id, barber]))
  );

  const DEFAULT_HOURS = Object.freeze([
    { day: 0, label: "Domingo", enabled: true, open: "09:00", close: "14:00" },
    { day: 1, label: "Segunda", enabled: true, open: "09:00", close: "19:00" },
    { day: 2, label: "Terça", enabled: true, open: "09:00", close: "19:00" },
    { day: 3, label: "Quarta", enabled: true, open: "09:00", close: "19:00" },
    { day: 4, label: "Quinta", enabled: true, open: "09:00", close: "19:00" },
    { day: 5, label: "Sexta", enabled: true, open: "09:00", close: "20:00" },
    { day: 6, label: "Sábado", enabled: true, open: "08:00", close: "18:00" }
  ]);

  function uid(prefix = "id") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function toLocalISO(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  }

  function getTodayISO() {
    return toLocalISO(new Date());
  }

  function plusDaysISO(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toLocalISO(date);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value) || 0);
  }

  function formatDateLabel(dateValue) {
    const date = typeof dateValue === "string" ? new Date(`${dateValue}T12:00:00`) : dateValue;
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long"
    }).format(date);
  }

  function formatTime(timeValue) {
    return timeValue.replace(":", "h");
  }

  function sanitizeUser(user) {
    if (!user) {
      return null;
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }

  function getUsers() {
    return readStorage(STORAGE_KEYS.users, []);
  }

  function saveUsers(users) {
    return writeStorage(STORAGE_KEYS.users, users);
  }

  function getServices() {
    return readStorage(STORAGE_KEYS.services, []);
  }

  function saveServices(services) {
    return writeStorage(STORAGE_KEYS.services, services);
  }

  function getBarbers() {
    return readStorage(STORAGE_KEYS.barbers, []);
  }

  function saveBarbers(barbers) {
    return writeStorage(STORAGE_KEYS.barbers, barbers);
  }

  function getBookings() {
    return readStorage(STORAGE_KEYS.bookings, []);
  }

  function saveBookings(bookings) {
    return writeStorage(STORAGE_KEYS.bookings, bookings);
  }

  function getBusinessHours() {
    return readStorage(STORAGE_KEYS.hours, []);
  }

  function saveBusinessHours(hours) {
    return writeStorage(STORAGE_KEYS.hours, hours);
  }

  function getSession() {
    return readStorage(STORAGE_KEYS.session, null);
  }

  function setSession(user) {
    return writeStorage(STORAGE_KEYS.session, sanitizeUser(user));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  function setRedirectTarget(path) {
    localStorage.setItem(STORAGE_KEYS.redirect, path);
  }

  function consumeRedirectTarget() {
    const path = localStorage.getItem(STORAGE_KEYS.redirect);
    localStorage.removeItem(STORAGE_KEYS.redirect);
    return path;
  }

  function setPendingBooking(bookingIntent) {
    writeStorage(STORAGE_KEYS.pendingBooking, bookingIntent);
  }

  function consumePendingBooking() {
    const intent = readStorage(STORAGE_KEYS.pendingBooking, null);
    localStorage.removeItem(STORAGE_KEYS.pendingBooking);
    return intent;
  }

  function seedAppData() {
    const users = getUsers();
    if (!users.some((user) => user.email === ADMIN_USER.email)) {
      saveUsers([...users, ADMIN_USER]);
    }

    if (!localStorage.getItem(STORAGE_KEYS.services)) {
      saveServices(DEFAULT_SERVICES.map((service) => ({ ...service })));
    }

    if (!localStorage.getItem(STORAGE_KEYS.barbers)) {
      saveBarbers(DEFAULT_BARBERS.map((barber) => ({ ...barber })));
    }

    if (!localStorage.getItem(STORAGE_KEYS.hours)) {
      saveBusinessHours(DEFAULT_HOURS.map((hour) => ({ ...hour })));
    }

    if (!localStorage.getItem(STORAGE_KEYS.bookings)) {
      const seededBookings = [
        {
          id: uid("booking"),
          serviceId: 2,
          serviceName: "Corte Degradê",
          barberId: 1,
          barberName: "Gabriell",
          date: getTodayISO(),
          time: "09:30",
          duration: 45,
          price: 45,
          userId: uid("seed-user"),
          userName: "Rafael Silva",
          userEmail: "rafael@cliente.com",
          status: "confirmed",
          createdAt: new Date().toISOString()
        },
        {
          id: uid("booking"),
          serviceId: 3,
          serviceName: "Corte + Barba",
          barberId: 2,
          barberName: "Manuelly",
          date: getTodayISO(),
          time: "13:00",
          duration: 75,
          price: 70,
          userId: uid("seed-user"),
          userName: "Bruno Lima",
          userEmail: "bruno@cliente.com",
          status: "confirmed",
          createdAt: new Date().toISOString()
        },
        {
          id: uid("booking"),
          serviceId: 1,
          serviceName: "Barba + Desondulação",
          barberId: 3,
          barberName: "João",
          date: plusDaysISO(2),
          time: "16:00",
          duration: 60,
          price: 55,
          userId: uid("seed-user"),
          userName: "Matheus Costa",
          userEmail: "matheus@cliente.com",
          status: "confirmed",
          createdAt: new Date().toISOString()
        }
      ];

      saveBookings(seededBookings);
    }
  }

  function migrateBrandingData() {
    const users = getUsers();
    let usersChanged = false;
    const nextUsers = users.map((user) => {
      if (user.email === ADMIN_USER.email && user.name !== ADMIN_USER.name) {
        usersChanged = true;
        return {
          ...user,
          name: ADMIN_USER.name,
          isAdmin: true
        };
      }

      return user;
    });

    if (usersChanged) {
      saveUsers(nextUsers);
      const session = getSession();
      if (session?.email === ADMIN_USER.email) {
        setSession({ ...session, name: ADMIN_USER.name, isAdmin: true });
      }
    }

    const barbers = getBarbers();
    const shouldResetBarbers =
      barbers.length !== DEFAULT_BARBERS.length ||
      DEFAULT_BARBERS.some((defaultBarber, index) => {
        const currentBarber = barbers[index];
        return (
          !currentBarber ||
          currentBarber.id !== defaultBarber.id ||
          currentBarber.name !== defaultBarber.name ||
          currentBarber.rating !== defaultBarber.rating ||
          currentBarber.specialty !== defaultBarber.specialty ||
          currentBarber.photo !== defaultBarber.photo
        );
      });

    if (shouldResetBarbers) {
      saveBarbers(DEFAULT_BARBERS.map((barber) => ({ ...barber })));
    }

    const bookings = getBookings();
    let bookingsChanged = false;
    const nextBookings = bookings.map((booking) => {
      const barberProfile = DEFAULT_BARBERS_BY_ID[Number(booking.barberId)];
      if (!barberProfile || booking.barberName === barberProfile.name) {
        return booking;
      }

      bookingsChanged = true;
      return {
        ...booking,
        barberName: barberProfile.name
      };
    });

    if (bookingsChanged) {
      saveBookings(nextBookings);
    }
  }

  function setAccountDropdownState(authButton, dropdown, isOpen) {
    if (!authButton || !dropdown) {
      return;
    }

    authButton.setAttribute("aria-expanded", String(isOpen));
    dropdown.classList.toggle("is-hidden", !isOpen);
  }

  function setupAccountDropdown(authButton, accountMenuShell, accountDropdown, session) {
    if (!authButton || !accountMenuShell || !accountDropdown) {
      return;
    }

    setAccountDropdownState(authButton, accountDropdown, false);
    accountMenuShell.classList.toggle("is-menu-enabled", Boolean(session && !session.isAdmin));

    document.addEventListener("click", (event) => {
      if (!accountMenuShell.contains(event.target)) {
        setAccountDropdownState(authButton, accountDropdown, false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setAccountDropdownState(authButton, accountDropdown, false);
      }
    });
  }

  function applySessionUI() {
    const session = getSession();
    const authButton = document.querySelector("[data-auth-button]");
    const adminLink = document.querySelector("[data-admin-link]");
    const accountMenuShell = authButton?.closest(".account-menu-shell") || null;
    const accountDropdown = accountMenuShell?.querySelector("[data-account-dropdown]") || null;

    setupAccountDropdown(authButton, accountMenuShell, accountDropdown, session);

    if (authButton) {
      authButton.textContent = session ? (session.isAdmin ? "Painel" : "Minha conta") : "Entrar";

      authButton.onclick = () => {
        if (!session) {
          window.location.href = "login.html";
          return;
        }

        if (session.isAdmin) {
          window.location.href = "admin.html";
          return;
        }

        if (accountDropdown) {
          const isClosed = accountDropdown.classList.contains("is-hidden");
          setAccountDropdownState(authButton, accountDropdown, isClosed);
        }
      };
    }

    if (adminLink) {
      adminLink.classList.toggle("is-hidden", !session?.isAdmin);
    }

    document.querySelectorAll("[data-logout]").forEach((logoutButton) => {
      logoutButton.onclick = () => {
        clearSession();
        notify("Sessão encerrada com segurança.");
        window.setTimeout(() => {
          window.location.href = "login.html";
        }, 350);
      };
    });
  }

  function login(email, password) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const users = getUsers();
    const user = users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);

    if (!user || user.password !== password) {
      throw new Error("Email ou senha inválidos.");
    }

    setSession(user);
    return sanitizeUser(user);
  }

  function register({ name, email, password }) {
    const users = getUsers();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error("Já existe uma conta cadastrada com este email.");
    }

    const newUser = {
      id: uid("user"),
      name: String(name || "").trim(),
      email: normalizedEmail,
      password,
      isAdmin: false
    };

    saveUsers([...users, newUser]);
    setSession(newUser);
    return sanitizeUser(newUser);
  }

  function redirectAfterAuth(session) {
    const redirectTarget = consumeRedirectTarget();

    if (session?.isAdmin) {
      window.location.href = redirectTarget && redirectTarget.includes("admin") ? redirectTarget : "admin.html";
      return;
    }

    window.location.href = redirectTarget || "index.html";
  }

  function requireAuth({ adminOnly = false, redirectTo = "login.html" } = {}) {
    const session = getSession();

    if (!session) {
      const currentPage = window.location.pathname.split("/").pop() || "index.html";
      setRedirectTarget(currentPage);
      window.location.href = redirectTo;
      return null;
    }

    if (adminOnly && !session.isAdmin) {
      notify("Acesso restrito ao barbeiro responsável.", "error");
      window.location.href = "index.html";
      return null;
    }

    return session;
  }

  function notify(message, type = "success", title = "") {
    const stack = document.getElementById("toastStack");
    if (!stack) {
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const toastTitle = document.createElement("strong");
    toastTitle.className = "toast-title";
    toastTitle.textContent =
      title || (type === "error" ? "Não foi possível concluir" : "Tudo certo");

    const toastBody = document.createElement("span");
    toastBody.className = "toast-body";
    toastBody.textContent = message;

    toast.append(toastTitle, toastBody);
    stack.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  function setValidationState(input, valid, message) {
    const group = input.closest(".input-group");
    const hint = group?.querySelector(".field-hint");

    if (!group || !hint) {
      return valid;
    }

    group.classList.remove("is-valid", "is-invalid");

    if (input.value.trim() === "") {
      hint.textContent = "";
      return false;
    }

    group.classList.add(valid ? "is-valid" : "is-invalid");
    hint.textContent = message;
    return valid;
  }

  function validateName(input) {
    const valid = input.value.trim().length >= 3;
    return setValidationState(input, valid, valid ? "Nome confirmado." : "Digite ao menos 3 caracteres.");
  }

  function validateEmail(input) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    return setValidationState(input, valid, valid ? "Email válido." : "Informe um email válido.");
  }

  function validatePassword(input) {
    const valid = input.value.trim().length >= 6;
    return setValidationState(input, valid, valid ? "Senha com tamanho mínimo atendido." : "Use pelo menos 6 caracteres.");
  }

  function setupPasswordToggles() {
    document.querySelectorAll("[data-toggle-password]").forEach((toggleButton) => {
      toggleButton.onclick = () => {
        const input = document.getElementById(toggleButton.dataset.togglePassword);
        if (!input) {
          return;
        }

        const nextType = input.type === "password" ? "text" : "password";
        input.type = nextType;
        toggleButton.innerHTML = `<i class="ph ph-${nextType === "password" ? "eye" : "eye-slash"}"></i>`;
      };
    });
  }

  function setupAuthPage() {
    const session = getSession();
    if (session) {
      redirectAfterAuth(session);
      return;
    }

    const toggle = document.getElementById("authModeToggle");
    const panels = document.getElementById("authPanels");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    if (!toggle || !panels || !loginForm || !signupForm) {
      return;
    }

    const toggleMode = (mode) => {
      toggle.dataset.mode = mode;
      panels.dataset.mode = mode;
      toggle.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.mode === mode);
      });
      loginForm.classList.toggle("is-active", mode === "login");
      signupForm.classList.toggle("is-active", mode === "signup");
      toggle.querySelector(".auth-toggle-indicator").style.transform =
        mode === "signup" ? "translateX(100%)" : "translateX(0)";
    };

    toggle.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => toggleMode(button.dataset.mode));
    });

    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const signupName = document.getElementById("signupName");
    const signupEmail = document.getElementById("signupEmail");
    const signupPassword = document.getElementById("signupPassword");

    loginEmail.addEventListener("input", () => validateEmail(loginEmail));
    loginPassword.addEventListener("input", () => validatePassword(loginPassword));
    signupName.addEventListener("input", () => validateName(signupName));
    signupEmail.addEventListener("input", () => validateEmail(signupEmail));
    signupPassword.addEventListener("input", () => validatePassword(signupPassword));

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const valid = [validateEmail(loginEmail), validatePassword(loginPassword)].every(Boolean);
      if (!valid) {
        notify("Revise os campos destacados antes de continuar.", "error");
        return;
      }

      try {
        const sessionData = login(loginEmail.value, loginPassword.value);
        notify(`Bem-vindo de volta, ${sessionData.name}.`);
        window.setTimeout(() => redirectAfterAuth(sessionData), 450);
      } catch (error) {
        notify(error.message, "error");
      }
    });

    signupForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const valid = [
        validateName(signupName),
        validateEmail(signupEmail),
        validatePassword(signupPassword)
      ].every(Boolean);

      if (!valid) {
        notify("Revise os campos destacados antes de criar sua conta.", "error");
        return;
      }

      try {
        const sessionData = register({
          name: signupName.value,
          email: signupEmail.value,
          password: signupPassword.value
        });
        notify("Conta criada com sucesso. Seu acesso já está liberado.");
        window.setTimeout(() => redirectAfterAuth(sessionData), 450);
      } catch (error) {
        notify(error.message, "error");
      }
    });

    setupPasswordToggles();
    toggleMode("login");
  }

  seedAppData();
  migrateBrandingData();

  document.addEventListener("DOMContentLoaded", () => {
    applySessionUI();
    setupPasswordToggles();

    if (document.body.dataset.page === "login") {
      setupAuthPage();
    }
  });

  window.AppAuth = {
    STORAGE_KEYS,
    ADMIN_USER,
    seedAppData,
    login,
    register,
    requireAuth,
    notify,
    getSession,
    clearSession,
    getUsers,
    getServices,
    saveServices,
    getBarbers,
    saveBarbers,
    getBookings,
    saveBookings,
    getBusinessHours,
    saveBusinessHours,
    setPendingBooking,
    consumePendingBooking,
    setRedirectTarget,
    formatCurrency,
    formatDateLabel,
    formatTime,
    applySessionUI
  };
})();
