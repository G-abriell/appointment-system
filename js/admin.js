(() => {
  const app = window.AppAuth;
  if (!app || document.body.dataset.page !== "admin") {
    return;
  }

  const session = app.requireAuth({ adminOnly: true });
  if (!session) {
    return;
  }

  const todayBookingsEl = document.getElementById("todayBookings");
  const todayBookingsCountEl = document.getElementById("todayBookingsCount");
  const todayRevenueEl = document.getElementById("todayRevenue");
  const activeServicesCountEl = document.getElementById("activeServicesCount");
  const todayLabelEl = document.getElementById("todayLabel");
  const serviceForm = document.getElementById("serviceForm");
  const serviceIdInput = document.getElementById("serviceId");
  const serviceNameInput = document.getElementById("serviceName");
  const serviceDurationInput = document.getElementById("serviceDuration");
  const servicePriceInput = document.getElementById("servicePrice");
  const serviceCancelEditBtn = document.getElementById("serviceCancelEdit");
  const serviceSubmitBtn = document.getElementById("serviceSubmitBtn");
  const adminServicesListEl = document.getElementById("adminServicesList");
  const hoursForm = document.getElementById("hoursForm");
  const saveHoursBtn = document.getElementById("saveHoursBtn");

  function getTodayISO() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  }

  function getTodayBookings() {
    return app
      .getBookings()
      .filter((booking) => booking.date === getTodayISO() && booking.status !== "cancelled")
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function renderOverview() {
    const todayBookings = getTodayBookings();
    const revenue = todayBookings.reduce((total, booking) => total + Number(booking.price || 0), 0);

    todayBookingsCountEl.textContent = String(todayBookings.length);
    todayRevenueEl.textContent = app.formatCurrency(revenue);
    activeServicesCountEl.textContent = String(app.getServices().length);
    todayLabelEl.textContent = `Hoje • ${app.formatDateLabel(getTodayISO())}`;
  }

  function renderTodayBookings() {
    const bookings = getTodayBookings();
    if (!bookings.length) {
      todayBookingsEl.innerHTML = `
        <div class="empty-state">
          <strong>Nenhum cliente marcado para hoje</strong>
          <span>Assim que novos horários forem reservados, eles aparecerão aqui.</span>
        </div>
      `;
      return;
    }

    todayBookingsEl.innerHTML = bookings
      .map(
        (booking) => `
          <article class="admin-appointment-card">
            <div class="booking-top">
              <div>
                <h3>${booking.userName}</h3>
                <p class="muted">${booking.userEmail}</p>
              </div>
              <span class="time-tag">${app.formatTime(booking.time)}</span>
            </div>
            <div class="booking-meta">
              <span class="status-badge confirmed">${booking.serviceName}</span>
              <span class="status-badge">${booking.barberName}</span>
              <span class="price-tag">${app.formatCurrency(booking.price)}</span>
            </div>
          </article>
        `
      )
      .join("");
  }

  function resetServiceForm() {
    serviceIdInput.value = "";
    serviceNameInput.value = "";
    serviceDurationInput.value = "";
    servicePriceInput.value = "";
    serviceSubmitBtn.textContent = "Salvar serviço";
  }

  function renderServicesAdmin() {
    const services = app.getServices();
    adminServicesListEl.innerHTML = services
      .map(
        (service) => `
          <article class="service-admin-card">
            <div class="service-admin-top">
              <div>
                <h3>${service.name}</h3>
                <p class="muted">${service.duration} min • ${app.formatCurrency(service.price)}</p>
              </div>
              <span class="price-tag">#${service.id}</span>
            </div>
            <div class="admin-card-actions">
              <button class="btn btn-secondary" type="button" data-edit-service="${service.id}">
                Editar
              </button>
              <button class="btn btn-secondary" type="button" data-delete-service="${service.id}">
                Excluir
              </button>
            </div>
          </article>
        `
      )
      .join("");

    adminServicesListEl.querySelectorAll("[data-edit-service]").forEach((button) => {
      button.addEventListener("click", () => {
        const service = app
          .getServices()
          .find((item) => item.id === Number(button.dataset.editService));
        if (!service) {
          return;
        }

        serviceIdInput.value = String(service.id);
        serviceNameInput.value = service.name;
        serviceDurationInput.value = String(service.duration);
        servicePriceInput.value = String(service.price);
        serviceSubmitBtn.textContent = "Atualizar serviço";
        serviceForm.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    adminServicesListEl.querySelectorAll("[data-delete-service]").forEach((button) => {
      button.addEventListener("click", () => {
        const serviceId = Number(button.dataset.deleteService);
        const nextServices = app.getServices().filter((service) => service.id !== serviceId);
        app.saveServices(nextServices);
        renderServicesAdmin();
        renderOverview();
        app.notify("Serviço removido da agenda online.");
      });
    });
  }

  function handleServiceSubmit(event) {
    event.preventDefault();

    const name = serviceNameInput.value.trim();
    const duration = Number(serviceDurationInput.value);
    const price = Number(servicePriceInput.value);

    if (!name || duration <= 0 || price < 0) {
      app.notify("Preencha nome, duração e preço corretamente.", "error");
      return;
    }

    const editingId = Number(serviceIdInput.value);
    const services = app.getServices();

    if (editingId) {
      const updatedServices = services.map((service) =>
        service.id === editingId ? { ...service, name, duration, price } : service
      );
      app.saveServices(updatedServices);
      app.notify("Serviço atualizado com sucesso.");
    } else {
      const nextId = services.length ? Math.max(...services.map((service) => service.id)) + 1 : 1;
      app.saveServices([...services, { id: nextId, name, duration, price }]);
      app.notify("Novo serviço adicionado.");
    }

    resetServiceForm();
    renderServicesAdmin();
    renderOverview();
  }

  function renderHoursAdmin() {
    hoursForm.innerHTML = app
      .getBusinessHours()
      .map(
        (hour) => `
          <div class="hours-admin-row" data-hour-row="${hour.day}">
            <div class="hours-admin-head">
              <strong>${hour.label}</strong>
              <label class="switch">
                <input type="checkbox" data-hour-enabled="${hour.day}" ${hour.enabled ? "checked" : ""} />
                <span>${hour.enabled ? "Aberto" : "Fechado"}</span>
              </label>
            </div>
            <div class="hours-admin-times">
              <input type="time" data-hour-open="${hour.day}" value="${hour.open}" ${hour.enabled ? "" : "disabled"} />
              <input type="time" data-hour-close="${hour.day}" value="${hour.close}" ${hour.enabled ? "" : "disabled"} />
            </div>
          </div>
        `
      )
      .join("");

    hoursForm.querySelectorAll("[data-hour-enabled]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const day = checkbox.dataset.hourEnabled;
        const openInput = hoursForm.querySelector(`[data-hour-open="${day}"]`);
        const closeInput = hoursForm.querySelector(`[data-hour-close="${day}"]`);
        const label = checkbox.closest(".switch")?.querySelector("span");

        openInput.disabled = !checkbox.checked;
        closeInput.disabled = !checkbox.checked;
        if (label) {
          label.textContent = checkbox.checked ? "Aberto" : "Fechado";
        }
      });
    });
  }

  function saveHours() {
    const nextHours = app.getBusinessHours().map((hour) => {
      const enabled = Boolean(hoursForm.querySelector(`[data-hour-enabled="${hour.day}"]`)?.checked);
      const open = hoursForm.querySelector(`[data-hour-open="${hour.day}"]`)?.value || hour.open;
      const close = hoursForm.querySelector(`[data-hour-close="${hour.day}"]`)?.value || hour.close;

      return {
        ...hour,
        enabled,
        open,
        close
      };
    });

    app.saveBusinessHours(nextHours);
    app.notify("Horários de funcionamento atualizados.");
  }

  serviceForm.addEventListener("submit", handleServiceSubmit);
  serviceCancelEditBtn.addEventListener("click", resetServiceForm);
  saveHoursBtn.addEventListener("click", saveHours);

  renderOverview();
  renderTodayBookings();
  renderServicesAdmin();
  renderHoursAdmin();
})();
