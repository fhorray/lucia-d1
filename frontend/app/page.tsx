"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<{
    user: {
      email: string;
      id: string;
      name: string;
      nickname: string;
    };
  }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await fetch("http://localhost:3001/v1/users/@me", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Erro ao criar a conta");
        }

        const result = await res.json();
        setUser(result);
      } catch (error) {
        console.log(error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (error) {
      router.push("/login");
    }

    getUser();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:3001/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao criar a conta");
      }

      router.push("/login");
      if (error) {
        router.push("/login");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center gap-4">
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          {!user ? (
            <div>
              <button className="p-4 bg-sky-400 rounded-md">
                <Link href={"/login"}>Login</Link>{" "}
              </button>
              <button className="p-4 bg-sky-400 rounded-md">
                <Link href={"/register"}>Register </Link>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <h3>
                  Welcome, {user.user.name}! ({user.user.nickname})
                </h3>
              </div>
              <button
                className="p-4 bg-blue-950/30 rounded-md font-bold"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
