import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const fetchReminders = (phone) =>
  axios.get(`${API_URL}/reminders`, { params: { phone } }).then((r) => r.data);

export const updateReminder = (id, data) =>
  axios.patch(`${API_URL}/reminders/${id}`, data).then((r) => r.data);

export const deleteReminder = (id) =>
  axios.delete(`${API_URL}/reminders/${id}`).then((r) => r.data);
