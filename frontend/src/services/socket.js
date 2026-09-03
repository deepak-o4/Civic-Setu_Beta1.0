import { io } from "socket.io-client";
import { API_ORIGIN } from "../utils/url";

const SOCKET_URL = API_ORIGIN;

let socket;

export const connectSocket = () => {
  const token = localStorage.getItem("auth_token");
  
  if (!token) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("Connected to Real-Time Socket Server");
  });

  socket.on("connect_error", (err) => {
    console.error("Socket Connection Error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
