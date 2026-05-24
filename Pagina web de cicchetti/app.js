const STORAGE_KEY = "cicchetti.reservations.v1";
const API_MODE = location.protocol.startsWith("http");
const API_URL = "/api/reservations";
const SLOT_CAPACITY = 22;
const AREAS = {
  salon: "Salón",
  barra: "Barra",
  vereda: "Vereda",
};

const timeSlots = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
];

let reservationsCache = [];

const form = document.querySelector("#reservationForm");
const dateInput = document.querySelector("#date");
const timeInput = document.querySelector("#time");
const guestsInput = document.querySelector("#guests");
const areaInput = document.querySelector("#area");
const nameInput = document.querySelector("#name");
const phoneInput = document.querySelector("#phone");
const emailInput = document.querySelector("#email");
const notesInput = document.querySelector("#notes");
const availabilityText = document.querySelector("#availabilityText");
const capacityMeter = document.querySelector("#capacityMeter");
const formMessage = document.querySelector("#formMessage");
const reservationsBody = document.querySelector("#reservationsBody");
const filterDateInput = document.querySelector("#filterDate");
const clearFilterButton = document.querySelector("#clearFilter");
const exportButton = document.querySelector("#exportReservations");

const summaryDate = document.querySelector("#summaryDate");
const summaryTime = document.querySelector("#summaryTime");
const summaryGuests = document.querySelector("#summaryGuests");
const summaryArea = document.querySelector("#summaryArea");

function getReservations() {
  if (API_MODE) {
    return reservationsCache;
  }

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveReservations(reservations) {
  if (API_MODE) {
    reservationsCache = reservations;
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

async function loadReservations() {
  if (!API_MODE) {
    reservationsCache = getReservations();
    return reservationsCache;
  }

  const query = filterDateInput.value ? `?date=${encodeURIComponent(filterDateInput.value)}` : "";
  const response = await fetch(`${API_URL}${query}`);
  if (!response.ok) {
    throw new Error("No se pudieron cargar las reservas.");
  }
  reservationsCache = await response.json();
  return reservationsCache;
}

function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

function isMonday(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day).getDay() === 1;
}

function isTooSoon(dateValue, timeValue) {
  if (!dateValue || !timeValue) return false;
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  const reservationTime = new Date(year, month - 1, day, hours, minutes);
  const minimum = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return reservationTime < minimum;
}

function bookedGuestsForSlot(dateValue, timeValue) {
  return getReservations()
    .filter((reservation) => reservation.date === dateValue && reservation.time === timeValue)
    .reduce((total, reservation) => total + Number(reservation.guests), 0);
}

function remainingSeats(dateValue, timeValue) {
  if (!dateValue || !timeValue) return SLOT_CAPACITY;
  return Math.max(0, SLOT_CAPACITY - bookedGuestsForSlot(dateValue, timeValue));
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateTimes() {
  timeInput.innerHTML = timeSlots
    .map((slot) => `<option value="${slot}">${slot}</option>`)
    .join("");
}

function updateSummary() {
  summaryDate.textContent = formatDate(dateInput.value);
  summaryTime.textContent = timeInput.value || "-";
  summaryGuests.textContent = guestsInput.value || "-";
  summaryArea.textContent = AREAS[areaInput.value] || "-";
}

function updateAvailability() {
  const dateValue = dateInput.value;
  const timeValue = timeInput.value;
  const guests = Number(guestsInput.value || 0);
  const remaining = remainingSeats(dateValue, timeValue);
  const booked = SLOT_CAPACITY - remaining;
  const percentage = Math.round((booked / SLOT_CAPACITY) * 100);

  capacityMeter.value = percentage;

  if (!dateValue || !timeValue) {
    availabilityText.textContent = "Seleccioná fecha y horario";
    return;
  }

  if (isMonday(dateValue)) {
    availabilityText.textContent = "Cerrado los lunes";
    return;
  }

  if (isTooSoon(dateValue, timeValue)) {
    availabilityText.textContent = "Reservá con al menos 2 horas de anticipación";
    return;
  }

  if (remaining < guests) {
    availabilityText.textContent = `Quedan ${remaining} lugares para ese horario`;
    return;
  }

  availabilityText.textContent = `Quedan ${remaining} lugares disponibles`;
}

function validateReservation() {
  const guests = Number(guestsInput.value);
  const remaining = remainingSeats(dateInput.value, timeInput.value);

  if (isMonday(dateInput.value)) {
    return "Cicchetti cierra los lunes. Elegí otra fecha.";
  }

  if (isTooSoon(dateInput.value, timeInput.value)) {
    return "Las reservas online necesitan al menos 2 horas de anticipación.";
  }

  if (guests < 1 || guests > 8) {
    return "Las reservas online son de 1 a 8 personas.";
  }

  if (remaining < guests) {
    return `No hay lugar suficiente en ese horario. Quedan ${remaining} lugares.`;
  }

  return "";
}

async function renderReservations() {
  const filterDate = filterDateInput.value;
  let source = getReservations();

  if (API_MODE) {
    try {
      source = await loadReservations();
      formMessage.classList.remove("error");
    } catch (error) {
      formMessage.textContent = error.message;
      formMessage.classList.add("error");
      source = [];
    }
  }

  const reservations = source
    .filter((reservation) => !filterDate || reservation.date === filterDate)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  if (!reservations.length) {
    reservationsBody.innerHTML = `<tr><td class="empty-row" colspan="7">No hay reservas para mostrar.</td></tr>`;
    return;
  }

  reservationsBody.innerHTML = reservations
    .map(
      (reservation) => `
        <tr>
          <td>${formatDate(reservation.date)}</td>
          <td>${reservation.time}</td>
          <td>
            <strong>${escapeHTML(reservation.name)}</strong>
            ${reservation.notes ? `<br><small>${escapeHTML(reservation.notes)}</small>` : ""}
          </td>
          <td>${reservation.guests}</td>
          <td>${AREAS[reservation.area]}</td>
          <td>
            <a href="tel:${escapeHTML(reservation.phone)}">${escapeHTML(reservation.phone)}</a><br>
            <a href="mailto:${escapeHTML(reservation.email)}">${escapeHTML(reservation.email)}</a>
          </td>
          <td><button class="delete-button" type="button" data-id="${reservation.id}">Cancelar</button></td>
        </tr>
      `
    )
    .join("");
}

function createReservation() {
  const reservation = {
    id: crypto.randomUUID(),
    date: dateInput.value,
    time: timeInput.value,
    guests: Number(guestsInput.value),
    area: areaInput.value,
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),
    notes: notesInput.value.trim(),
    createdAt: new Date().toISOString(),
  };

  return reservation;
}

async function persistReservation(reservation) {
  if (!API_MODE) {
    const reservations = getReservations();
    reservations.push(reservation);
    saveReservations(reservations);
    return reservation;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reservation),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo guardar la reserva.");
  }

  reservationsCache.push(payload);
  return payload;
}

async function deleteReservation(id) {
  if (!API_MODE) {
    const reservations = getReservations().filter((reservation) => reservation.id !== id);
    saveReservations(reservations);
    return;
  }

  const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.error || "No se pudo cancelar la reserva.");
  }
}

function exportCSV() {
  if (API_MODE) {
    window.location.href = "/api/reservations.csv";
    return;
  }

  const reservations = getReservations();
  if (!reservations.length) {
    formMessage.textContent = "Todavía no hay reservas para exportar.";
    formMessage.classList.add("error");
    return;
  }

  const headers = ["fecha", "hora", "nombre", "personas", "sector", "telefono", "email", "comentarios"];
  const rows = reservations.map((reservation) =>
    [
      reservation.date,
      reservation.time,
      reservation.name,
      reservation.guests,
      AREAS[reservation.area],
      reservation.phone,
      reservation.email,
      reservation.notes,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reservas-cicchetti-${todayISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function setInitialDates() {
  const today = todayISO();
  dateInput.min = today;
  dateInput.value = today;
  filterDateInput.min = today;
}

populateTimes();
setInitialDates();

[dateInput, timeInput, guestsInput, areaInput].forEach((field) => {
  field.addEventListener("input", () => {
    updateSummary();
    updateAvailability();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.classList.remove("error");
  formMessage.textContent = "";

  const error = validateReservation();
  if (error) {
    formMessage.textContent = error;
    formMessage.classList.add("error");
    updateAvailability();
    return;
  }

  try {
    const reservation = await persistReservation(createReservation());
    form.reset();
    dateInput.value = reservation.date;
    guestsInput.value = "2";
    areaInput.value = "salon";
    formMessage.textContent = `Reserva confirmada para ${reservation.name} el ${formatDate(reservation.date)} a las ${reservation.time}.`;
    updateSummary();
    updateAvailability();
    await renderReservations();
  } catch (error) {
    formMessage.textContent = error.message;
    formMessage.classList.add("error");
  }
});

reservationsBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  try {
    await deleteReservation(button.dataset.id);
    await renderReservations();
    updateAvailability();
  } catch (error) {
    formMessage.textContent = error.message;
    formMessage.classList.add("error");
  }
});

filterDateInput.addEventListener("input", renderReservations);
clearFilterButton.addEventListener("click", () => {
  filterDateInput.value = "";
  renderReservations();
});
exportButton.addEventListener("click", exportCSV);

loadReservations()
  .catch((error) => {
    formMessage.textContent = error.message;
    formMessage.classList.add("error");
  })
  .finally(() => {
    updateSummary();
    updateAvailability();
    renderReservations();
  });
