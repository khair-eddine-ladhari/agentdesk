

"use client"; // required: useState, useEffect, sessionStorage, context provider wrapping the app

import { createContext, useState, useEffect } from "react";

export const GlobalContext = createContext();
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function GlobalState({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem("adminToken");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));

      if (payload.exp * 1000 < Date.now()) {
        sessionStorage.removeItem("adminToken");
        return;
      }

      setUser({ id: payload.id, role: payload.role });
    } catch (err) {
      sessionStorage.removeItem("adminToken");
    }
  }, []);

  const login = (userData) => {
    const { password, __v, ...safeUser } = userData;
    setUser(safeUser);
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("adminToken");
  };

  return (
    <GlobalContext.Provider value={{ user, login, logout }}>
      {children}
    </GlobalContext.Provider>
  );
}