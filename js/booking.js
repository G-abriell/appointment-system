(() => {
  const app = window.AppAuth;
  if (!app || document.body.dataset.page !== "home") {
    return;
  }

  const serviceDetails = {
    1: {
      icon: "ph-wind",
      description: "Tratamento de barba com acabamento limpo e alinhamento final."
    },
    2: {
      icon: "ph-scissors",
      description: "Degradê técnico com leitura precisa de volume e nuca."
    },
    3: {
      icon: "ph-crown-simple",
      description: "Combo completo para quem quer presença do corte à barba."
    },
    4: {
      icon: "ph-eye",
      description: "Desenho de sobrancelha para reforçar expressão e limpeza."
    }
  };

  const pageState = {
    activeTab: "services",
    searchTerm: "",
    modalOpen: false,
    step: 1,
    currentMonth: startOfMonth(new Date()),
    selection: {
      serviceId: null,
      barberId: null,
      date: null,
      time: null
    }
  };

  const tabContent = document.getElementById("tabContent");
  const tabHeader = document.getElementById("tabsHeader");
  const tabIndicator = document.getElementById("tabIndicator");
  const hoursList = document.getElementById("hoursList");
  const userBookingsList = document.getElementById("userBookings");
  const searchInput = document.getElementById("serviceSearch");
  const modal = document.getElementById("bookingModal");
  const modalContent = document.getElementById("bookingStepContent");
  const modalBackBtn = document.getElementById("bookingBackBtn");
  const modalNextBtn = document.getElementById("bookingNextBtn");
  const stepper = document.getElementById("bookingStepper");
  const heroCover = document.getElementById("heroCover");
  const closeModalBtn = document.getElementById("closeBookingModal");

  function getServices() {
    return app.getServices();
  }

  function getBarbers() {
    return app.getBarbers();
  }

  function getBookings() {
    return app.getBookings();
  }

  function getHours() {
    return app.getBusinessHours();
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function toDateISO(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  }

  function parseDate(dateString) {
    return new Date(`${dateString}T12:00:00`);
  }

  function isPastDate(dateString) {
    const candidate = parseDate(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return candidate < today;
  }

  function getWeekdayHours(dateString) {
    const date = parseDate(dateString);
    return getHours().find((hour) => hour.day === date.getDay());
  }

  function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function isServiceAvailableForDate(dateString) {
    const hours = getWeekdayHours(dateString);
    return Boolean(hours?.enabled);
  }

  function getSlotTimes(dateString, duration) {
    const hours = getWeekdayHours(dateString);
    if (!hours || !hours.enabled) {
      return [];
    }

    const openMinutes = timeToMinutes(hours.open);
    const closeMinutes = timeToMinutes(hours.close);
    const serviceDuration = Number(duration) || 30;
    const slots = [];

    for (let current = openMinutes; current + serviceDuration <= closeMinutes; current += 30) {
      slots.push(minutesToTime(current));
    }

    return slots;
  }

  function getSelectedService() {
    return getServices().find((service) => service.id === Number(pageState.selection.serviceId)) || null;
  }

  function getSelectedBarber() {
    return getBarbers().find((barber) => barber.id === Number(pageState.selection.barberId)) || null;
  }

  function getOccupiedSlots(dateString, barberId) {
    return getBookings().filter((booking) => {
      return (
        booking.date === dateString &&
        booking.barberId === Number(barberId) &&
        booking.status !== "cancelled"
      );
    });
  }

  function slotOverlaps(slotTime, selectedDuration, existingBooking) {
    const slotStart = timeToMinutes(slotTime);
    const slotEnd = slotStart + selectedDuration;
    const bookingStart = timeToMinutes(existingBooking.time);
    const bookingEnd = bookingStart + Number(existingBooking.duration || 30);
    return slotStart < bookingEnd && slotEnd > bookingStart;
  }

  function renderHoursSidebar() {
    const todayDay = new Date().getDay();
    hoursList.innerHTML = getHours()
      .map((hour) => {
        const status = hour.enabled ? `${hour.open} - ${hour.close}` : "Fechado";
        return `
          <div class="hours-row ${hour.day === todayDay ? "is-today" : ""}">
            <span>${hour.label}</span>
            <strong>${status}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderServiceCards() {
    const normalizedQuery = pageState.searchTerm.trim().toLowerCase();
    const filteredServices = getServices().filter((service) =>
      service.name.toLowerCase().includes(normalizedQuery)
    );

    if (!filteredServices.length) {
      return `
        <div class="empty-state">
          <strong>Nenhum serviço encontrado</strong>
          <span>Tente buscar por outro termo ou limpe a busca para ver todos.</span>
        </div>
      `;
    }

    return `
      <div class="cards-grid">
        ${filteredServices
          .map((service) => {
            const detail = serviceDetails[service.id] || {
              icon: "ph-sparkle",
              description: "Atendimento premium com acabamento sob medida."
            };

            return `
              <article class="service-card">
                <div class="service-top">
                  <div class="service-icon">
                    <i class="ph ${detail.icon}"></i>
                  </div>
                  <span class="price-tag">${app.formatCurrency(service.price)}</span>
                </div>
                <div>
                  <h3>${service.name}</h3>
                  <p class="muted">${detail.description}</p>
                </div>
                <div class="service-meta">
                  <span class="time-tag">${service.duration} min</span>
                </div>
                <div class="service-actions">
                  <button class="btn btn-primary glow" type="button" data-book-service="${service.id}">
                    Agendar
                  </button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderProfessionals() {
    return `
      <div class="professionals-grid">
        ${getBarbers()
          .map(
            (barber) => `
              <article class="professional-card">
                <div class="professional-top">
                  <img class="professional-avatar" src="${barber.photo}" alt="Retrato de ${barber.name}" />
                  <div class="professional-rating">
                    <i class="ph ph-star-fill"></i>
                    <span>${barber.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <h3>${barber.name}</h3>
                  <p class="muted">${barber.specialty}</p>
                </div>
                <div class="service-actions">
                  <button class="btn btn-secondary" type="button" data-book-barber="${barber.id}">
                    Escolher no agendamento
                  </button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderLoyalty() {
    const rewards = [
      {
        icon: "ph-medal",
        title: "Plano Bronze",
        description: "A cada 5 cortes, ganhe design de sobrancelha no próximo atendimento."
      },
      {
        icon: "ph-crown",
        title: "Plano Gold",
        description: "Combo com barba modelada com 10% off após 3 visitas no mesmo mês."
      },
      {
        icon: "ph-gift",
        title: "Indique e Ganhe",
        description: "Trouxe um amigo? Ambos recebem upgrade de finalização especial."
      }
    ];

    return `
      <div class="rewards-grid">
        ${rewards
          .map(
            (reward) => `
              <article class="reward-card">
                <div class="reward-icon">
                  <i class="ph ${reward.icon}"></i>
                </div>
                <div>
                  <h3>${reward.title}</h3>
                  <p class="muted">${reward.description}</p>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderProducts() {
    const products = [
      { name: "Pomada Matte Hold", price: 48, tag: "ph-drop" },
      { name: "Óleo para Barba Signature", price: 42, tag: "ph-bottle" },
      { name: "Shampoo Refresh Mentolado", price: 39, tag: "ph-sparkle" }
    ];

    return `
      <div class="products-grid">
        ${products
          .map(
            (product) => `
              <article class="product-card">
                <div class="product-tag">
                  <i class="ph ${product.tag}"></i>
                </div>
                <div>
                  <h3>${product.name}</h3>
                  <p class="muted">Seleção usada no acabamento e manutenção em casa.</p>
                </div>
                <div class="product-meta">
                  <span class="price-tag">${app.formatCurrency(product.price)}</span>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderReviews() {
    const reviews = [
      {
        name: "Daniel Souza",
        text: "Melhor experiência que tive em barbearia. Corte saiu exatamente como eu queria.",
        score: "5.0"
      },
      {
        name: "Caio Ferreira",
        text: "Ambiente bonito, atendimento pontual e acabamento de barba impecável.",
        score: "5.0"
      },
      {
        name: "Felipe Moura",
        text: "Agendamento simples, profissionalismo alto e resultado muito acima da média.",
        score: "4.9"
      }
    ];

    return `
      <div class="reviews-grid">
        ${reviews
          .map(
            (review) => `
              <article class="review-card">
                <div class="review-score">${review.score}</div>
                <div>
                  <h3>${review.name}</h3>
                  <p class="muted">${review.text}</p>
                </div>
                <div class="service-meta">
                  <span class="stars">★★★★★</span>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderTabContent() {
    const renderers = {
      services: renderServiceCards,
      professionals: renderProfessionals,
      loyalty: renderLoyalty,
      products: renderProducts,
      reviews: renderReviews
    };

    tabContent.innerHTML = renderers[pageState.activeTab]();
    bindDynamicActions();
  }

  function moveTabIndicator(activeButton) {
    if (!activeButton || !tabIndicator) {
      return;
    }

    tabIndicator.style.width = `${activeButton.offsetWidth}px`;
    tabIndicator.style.transform = `translateX(${activeButton.offsetLeft}px)`;
  }

  function setupTabs() {
    const buttons = tabHeader.querySelectorAll("[data-tab]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        pageState.activeTab = button.dataset.tab;
        buttons.forEach((item) => item.classList.toggle("is-active", item === button));
        renderTabContent();
        moveTabIndicator(button);
      });
    });

    const activeButton = tabHeader.querySelector(".tab-button.is-active");
    moveTabIndicator(activeButton);
    window.addEventListener("resize", () => moveTabIndicator(tabHeader.querySelector(".tab-button.is-active")));
  }

  function renderMyBookings() {
    const session = app.getSession();
    if (!session) {
      userBookingsList.innerHTML = `
        <div class="empty-state">
          <strong>Faça login para acompanhar seus horários</strong>
          <span>Ao entrar, você poderá visualizar, confirmar e cancelar seus agendamentos online.</span>
          <a class="btn btn-primary glow" href="login.html">Entrar agora</a>
        </div>
      `;
      return;
    }

    const bookings = getBookings()
      .filter((booking) => booking.userId === session.id)
      .sort((a, b) => new Date(`${a.date}T${a.time}:00`) - new Date(`${b.date}T${b.time}:00`));

    if (!bookings.length) {
      userBookingsList.innerHTML = `
        <div class="empty-state">
          <strong>Nenhum agendamento por aqui ainda</strong>
          <span>Escolha um serviço e reserve seu próximo horário em poucos toques.</span>
          <button class="btn btn-primary glow" type="button" data-open-booking>Agendar agora</button>
        </div>
      `;
      bindOpenBookingButtons();
      return;
    }

    userBookingsList.innerHTML = bookings
      .map(
        (booking) => `
          <article class="booking-card">
            <div class="booking-top">
              <div>
                <h3>${booking.serviceName}</h3>
                <p class="muted">${booking.barberName}</p>
              </div>
              <span class="status-badge ${booking.status}">${booking.status === "cancelled" ? "Cancelado" : "Confirmado"}</span>
            </div>
            <div class="booking-meta">
              <span class="time-tag">${app.formatDateLabel(booking.date)}</span>
              <span class="time-tag">${app.formatTime(booking.time)}</span>
              <span class="price-tag">${app.formatCurrency(booking.price)}</span>
            </div>
            <div class="booking-actions">
              ${
                booking.status !== "cancelled"
                  ? `<button class="btn btn-secondary" type="button" data-cancel-booking="${booking.id}">Cancelar</button>`
                  : ""
              }
            </div>
          </article>
        `
      )
      .join("");

    userBookingsList.querySelectorAll("[data-cancel-booking]").forEach((button) => {
      button.addEventListener("click", () => cancelBooking(button.dataset.cancelBooking));
    });
  }

  function cancelBooking(bookingId) {
    const updatedBookings = getBookings().map((booking) =>
      booking.id === bookingId ? { ...booking, status: "cancelled" } : booking
    );

    app.saveBookings(updatedBookings);
    renderMyBookings();
    if (pageState.modalOpen && pageState.step === 3) {
      renderStepContent();
    }
    app.notify("Agendamento cancelado com sucesso.");
  }

  function bindDynamicActions() {
    document.querySelectorAll("[data-book-service]").forEach((button) => {
      button.addEventListener("click", () => startBookingFlow({ serviceId: Number(button.dataset.bookService) }));
    });

    document.querySelectorAll("[data-book-barber]").forEach((button) => {
      button.addEventListener("click", () => startBookingFlow({ barberId: Number(button.dataset.bookBarber) }));
    });
  }

  function bindOpenBookingButtons() {
    document.querySelectorAll("[data-open-booking]").forEach((button) => {
      button.addEventListener("click", () => startBookingFlow({}));
    });
  }

  function ensureAuthenticatedForBooking(intent = {}) {
    const session = app.getSession();
    if (session) {
      return true;
    }

    app.setPendingBooking(intent);
    app.setRedirectTarget("index.html");
    app.notify("Faça login para reservar seu horário.", "error");
    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 350);
    return false;
  }

  function startBookingFlow(intent = {}) {
    if (!ensureAuthenticatedForBooking(intent)) {
      return;
    }

    pageState.selection = {
      serviceId: intent.serviceId || null,
      barberId: intent.barberId || null,
      date: null,
      time: null
    };

    if (intent.serviceId && intent.barberId) {
      pageState.step = 3;
    } else if (intent.serviceId) {
      pageState.step = 2;
    } else {
      pageState.step = 1;
    }

    openModal();
  }

  function openModal() {
    pageState.modalOpen = true;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    renderStepper();
    renderStepContent();
  }

  function closeModal() {
    pageState.modalOpen = false;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function renderStepper() {
    const steps = [
      "Serviço",
      "Profissional",
      "Data e hora",
      "Confirmação"
    ];

    stepper.innerHTML = steps
      .map((title, index) => {
        const stepNumber = index + 1;
        const status =
          pageState.step === stepNumber
            ? "is-active"
            : pageState.step > stepNumber
            ? "is-complete"
            : "";

        return `
          <div class="step-item ${status}">
            <div class="step-item-head">
              <span class="step-dot">${pageState.step > stepNumber ? "✓" : stepNumber}</span>
              <span class="step-title">${title}</span>
            </div>
            <div class="step-line"></div>
          </div>
        `;
      })
      .join("");
  }

  function renderStepOne() {
    modalContent.innerHTML = `
      <div class="select-grid">
        ${getServices()
          .map((service) => {
            const selected = Number(pageState.selection.serviceId) === service.id;
            const detail = serviceDetails[service.id] || {
              icon: "ph-sparkle",
              description: "Atendimento premium com acabamento sob medida."
            };

            return `
              <article class="service-card selection-card ${selected ? "is-selected" : ""}" data-select-service="${service.id}">
                <div class="service-top">
                  <div class="service-icon">
                    <i class="ph ${detail.icon}"></i>
                  </div>
                  <span class="price-tag">${app.formatCurrency(service.price)}</span>
                </div>
                <div>
                  <h3>${service.name}</h3>
                  <p class="muted">${detail.description}</p>
                </div>
                <div class="service-meta">
                  <span class="time-tag">${service.duration} min</span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;

    modalContent.querySelectorAll("[data-select-service]").forEach((button) => {
      button.addEventListener("click", () => {
        pageState.selection.serviceId = Number(button.dataset.selectService);
        pageState.selection.time = null;
        renderStepContent();
      });
    });
  }

  function renderStepTwo() {
    modalContent.innerHTML = `
      <div class="select-grid">
        ${getBarbers()
          .map((barber) => {
            const selected = Number(pageState.selection.barberId) === barber.id;
            return `
              <article class="professional-card selection-card ${selected ? "is-selected" : ""}" data-select-barber="${barber.id}">
                <div class="professional-top">
                  <img class="professional-avatar" src="${barber.photo}" alt="Retrato de ${barber.name}" />
                  <span class="price-tag">${barber.rating.toFixed(1)}</span>
                </div>
                <div>
                  <h3>${barber.name}</h3>
                  <p class="muted">${barber.specialty}</p>
                </div>
                <div class="service-meta">
                  <span class="status-badge confirmed">Especialista</span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;

    modalContent.querySelectorAll("[data-select-barber]").forEach((button) => {
      button.addEventListener("click", () => {
        pageState.selection.barberId = Number(button.dataset.selectBarber);
        pageState.selection.time = null;
        renderStepContent();
      });
    });
  }

  function renderCalendar() {
    const month = pageState.currentMonth;
    const firstDayIndex = month.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const monthLabel = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric"
    }).format(month);
    const today = toDateISO(new Date());
    const daysMarkup = [];

    for (let index = 0; index < firstDayIndex; index += 1) {
      daysMarkup.push(`<button class="calendar-day is-outside" type="button" disabled aria-hidden="true"></button>`);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      const dateISO = toDateISO(date);
      const disabled = isPastDate(dateISO) || !isServiceAvailableForDate(dateISO);
      const selected = pageState.selection.date === dateISO;
      const todayClass = today === dateISO ? "is-today" : "";

      daysMarkup.push(`
        <button
          class="calendar-day ${disabled ? "is-disabled" : ""} ${selected ? "is-selected" : ""} ${todayClass}"
          type="button"
          data-day="${dateISO}"
          ${disabled ? "disabled" : ""}
        >
          ${day}
        </button>
      `);
    }

    return `
      <div class="calendar-shell">
        <div class="calendar-top">
          <h4>${monthLabel}</h4>
          <div class="calendar-nav">
            <button class="icon-btn" type="button" id="prevMonthBtn" aria-label="Mês anterior">
              <i class="ph ph-caret-left"></i>
            </button>
            <button class="icon-btn" type="button" id="nextMonthBtn" aria-label="Próximo mês">
              <i class="ph ph-caret-right"></i>
            </button>
          </div>
        </div>
        <div class="calendar-weekdays">
          <span>Dom</span>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
        </div>
        <div class="calendar-days">
          ${daysMarkup.join("")}
        </div>
      </div>
    `;
  }

  function renderSlots() {
    const selectedService = getSelectedService();
    const selectedDate = pageState.selection.date;

    if (!selectedService || !selectedDate) {
      return `
        <div class="empty-state">
          <strong>Escolha uma data disponível</strong>
          <span>Assim que você selecionar um dia, os horários livres aparecerão aqui.</span>
        </div>
      `;
    }

    const slots = getSlotTimes(selectedDate, selectedService.duration);
    const occupiedBookings = getOccupiedSlots(selectedDate, pageState.selection.barberId);

    if (!slots.length) {
      return `
        <div class="empty-state">
          <strong>Barbearia fechada nessa data</strong>
          <span>Selecione outro dia para ver os horários disponíveis.</span>
        </div>
      `;
    }

    return `
      <div class="slots-grid">
        ${slots
          .map((slot) => {
            const occupied = occupiedBookings.some((booking) =>
              slotOverlaps(slot, selectedService.duration, booking)
            );
            const selected = pageState.selection.time === slot;

            return `
              <button
                class="slot-button ${occupied ? "is-occupied" : ""} ${selected ? "is-selected" : ""}"
                type="button"
                data-slot="${slot}"
                ${occupied ? "disabled" : ""}
              >
                ${slot.replace(":", "h")}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderStepThree() {
    modalContent.innerHTML = `
      <div class="calendar-grid">
        ${renderCalendar()}
        <div>
          <p class="eyebrow">Horários</p>
          <h4>Slots de 30 min</h4>
          <p class="muted">Disponibilidade entre 09h e 19h conforme a operação do dia.</p>
          ${renderSlots()}
        </div>
      </div>
    `;

    const prevMonthBtn = document.getElementById("prevMonthBtn");
    const nextMonthBtn = document.getElementById("nextMonthBtn");

    prevMonthBtn.addEventListener("click", () => {
      pageState.currentMonth = new Date(
        pageState.currentMonth.getFullYear(),
        pageState.currentMonth.getMonth() - 1,
        1
      );
      renderStepContent();
    });

    nextMonthBtn.addEventListener("click", () => {
      pageState.currentMonth = new Date(
        pageState.currentMonth.getFullYear(),
        pageState.currentMonth.getMonth() + 1,
        1
      );
      renderStepContent();
    });

    modalContent.querySelectorAll("[data-day]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const ripple = document.createElement("span");
        ripple.className = "calendar-ripple";
        ripple.style.left = `${event.offsetX}px`;
        ripple.style.top = `${event.offsetY}px`;
        button.appendChild(ripple);

        pageState.selection.date = button.dataset.day;
        pageState.selection.time = null;

        window.setTimeout(() => {
          renderStepContent();
        }, 110);
      });
    });

    modalContent.querySelectorAll("[data-slot]").forEach((button) => {
      button.addEventListener("click", () => {
        pageState.selection.time = button.dataset.slot;
        renderStepContent();
      });
    });
  }

  function renderStepFour() {
    const service = getSelectedService();
    const barber = getSelectedBarber();

    modalContent.innerHTML = `
      <div class="summary-grid">
        <article class="summary-card">
          <div class="summary-line">
            <span>Serviço</span>
            <strong class="summary-value">${service?.name || "-"}</strong>
          </div>
          <div class="summary-line">
            <span>Profissional</span>
            <strong class="summary-value">${barber?.name || "-"}</strong>
          </div>
          <div class="summary-line">
            <span>Data</span>
            <strong class="summary-value">${pageState.selection.date ? app.formatDateLabel(pageState.selection.date) : "-"}</strong>
          </div>
          <div class="summary-line">
            <span>Horário</span>
            <strong class="summary-value mono">${pageState.selection.time ? app.formatTime(pageState.selection.time) : "-"}</strong>
          </div>
          <div class="summary-line">
            <span>Duração</span>
            <strong class="summary-value mono">${service?.duration || 0} min</strong>
          </div>
          <div class="summary-line">
            <span>Total</span>
            <strong class="summary-value mono">${app.formatCurrency(service?.price || 0)}</strong>
          </div>
        </article>
      </div>
    `;
  }

  function updateModalButtons() {
    modalBackBtn.disabled = pageState.step === 1;

    if (pageState.step === 4) {
      modalNextBtn.textContent = "Confirmar agendamento";
      modalNextBtn.disabled = !canAdvance();
      return;
    }

    modalNextBtn.textContent = "Continuar";
    modalNextBtn.disabled = !canAdvance();
  }

  function canAdvance() {
    if (pageState.step === 1) {
      return Boolean(pageState.selection.serviceId);
    }

    if (pageState.step === 2) {
      return Boolean(pageState.selection.barberId);
    }

    if (pageState.step === 3) {
      return Boolean(pageState.selection.date && pageState.selection.time);
    }

    return Boolean(
      pageState.selection.serviceId &&
        pageState.selection.barberId &&
        pageState.selection.date &&
        pageState.selection.time
    );
  }

  function renderStepContent() {
    renderStepper();

    if (pageState.step === 1) {
      renderStepOne();
    } else if (pageState.step === 2) {
      renderStepTwo();
    } else if (pageState.step === 3) {
      renderStepThree();
    } else {
      renderStepFour();
    }

    updateModalButtons();
  }

  function confirmBooking() {
    const session = app.getSession();
    const service = getSelectedService();
    const barber = getSelectedBarber();

    if (!session || !service || !barber || !canAdvance()) {
      return;
    }

    const conflictExists = getOccupiedSlots(pageState.selection.date, barber.id).some((booking) =>
      slotOverlaps(pageState.selection.time, service.duration, booking)
    );

    if (conflictExists) {
      pageState.step = 3;
      renderStepContent();
      app.notify("Esse horário acabou de ficar indisponível. Escolha outro slot.", "error");
      return;
    }

    const booking = {
      id: `booking-${Date.now()}`,
      serviceId: service.id,
      serviceName: service.name,
      barberId: barber.id,
      barberName: barber.name,
      date: pageState.selection.date,
      time: pageState.selection.time,
      duration: service.duration,
      price: service.price,
      userId: session.id,
      userName: session.name,
      userEmail: session.email,
      status: "confirmed",
      createdAt: new Date().toISOString()
    };

    app.saveBookings([...getBookings(), booking]);
    renderMyBookings();
    closeModal();
    app.notify("Agendamento confirmado com sucesso.");
  }

  function setupModal() {
    modalBackBtn.addEventListener("click", () => {
      if (pageState.step > 1) {
        pageState.step -= 1;
        renderStepContent();
      }
    });

    modalNextBtn.addEventListener("click", () => {
      if (pageState.step === 4) {
        confirmBooking();
        return;
      }

      if (canAdvance()) {
        pageState.step += 1;
        renderStepContent();
      }
    });

    closeModalBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && pageState.modalOpen) {
        closeModal();
      }
    });
  }

  function setupSearch() {
    if (!searchInput) {
      return;
    }

    searchInput.addEventListener("input", () => {
      pageState.searchTerm = searchInput.value;
      if (pageState.activeTab === "services") {
        renderTabContent();
      }
    });
  }

  function setupCopyPhone() {
    const button = document.getElementById("copyPhone");
    if (!button) {
      return;
    }

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("(83) 99863-1100");
        app.notify("Telefone copiado para a área de transferência.");
      } catch (error) {
        app.notify("Não foi possível copiar o telefone automaticamente.", "error");
      }
    });
  }

  function setupParallax() {
    if (!heroCover) {
      return;
    }

    window.addEventListener("scroll", () => {
      const offset = Math.min(window.scrollY * 0.18, 48);
      heroCover.style.transform = `scale(1.04) translateY(${offset}px)`;
    });
  }

  function tryResumePendingBooking() {
    const session = app.getSession();
    if (!session) {
      return;
    }

    const intent = app.consumePendingBooking();
    if (!intent) {
      return;
    }

    startBookingFlow(intent);
  }

  renderHoursSidebar();
  renderTabContent();
  renderMyBookings();
  setupTabs();
  setupModal();
  setupSearch();
  setupCopyPhone();
  setupParallax();
  bindOpenBookingButtons();
  tryResumePendingBooking();
})();
