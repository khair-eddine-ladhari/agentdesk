"use client";

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

export const GlobalContext = createContext();

// Convenience hook - same as `useContext(GlobalContext)`, just shorter to
// call from every component that needs user/workspace/loading.
export function useGlobalContext() {
  return useContext(GlobalContext);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function GlobalState({ children }) {
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const token = sessionStorage.getItem("adminToken");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));

        // Token expired
        if (payload.exp * 1000 < Date.now()) {
          sessionStorage.removeItem("adminToken");
          setLoading(false);
          return;
        }

        setUser({
          id: payload.userId,
        });

        // Load the user's workspaces
        const res = await axios.get(`${API_URL}/workspaces`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data.length > 0) {
          setWorkspace(res.data[0]);
        }

      } catch (err) {
        console.error(err);
        sessionStorage.removeItem("adminToken");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const login = (userData) => {
    const { password, __v, ...safeUser } = userData;
    setUser(safeUser);
  };

  const logout = () => {
    sessionStorage.removeItem("adminToken");
    setUser(null);
    setWorkspace(null);
  };

  return (
    <GlobalContext.Provider
      value={{
        user,
        workspace,
        loading,
        login,
        logout,
        setWorkspace,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}