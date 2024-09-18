"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";

interface FormValues {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const route = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    console.log(data);

    try {
      const response = await fetch("http://localhost:3001/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar a conta");
      }

      route.push("/");

      const result = await response.json();
      console.log("Usuário criado com sucesso:", result);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-6 rounded-lg shadow-md space-y-4"
      >
        <h2 className="text-xl font-bold mb-4 text-black">Login</h2>

        <div>
          <label
            className="block font-medium text-sm text-black"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email", {
              required: "Email é obrigatório",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email inválido",
              },
            })}
            className="border p-2 w-full text-black"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            className="block font-medium text-sm text-black"
            htmlFor="password"
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            {...register("password", {
              required: "Senha é obrigatória",
              minLength: {
                value: 3,
                message: "Senha deve ter no mínimo 6 caracteres",
              },
            })}
            className="border p-2 w-full text-black"
          />
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded w-full"
        >
          Entrar
        </button>
        <Link href={"/register"}>
          <button
            type="button"
            className="bg-blue-100 p-2 rounded w-full text-blue-300"
          >
            Criar Conta
          </button>
        </Link>

        <a href={"http://localhost:3001/v1/auth/google"}>
          <button
            type="button"
            className="bg-blue-100 p-2 rounded w-full text-blue-300"
          >
            LOGAR COM GOOGLE
          </button>
        </a>
      </form>
    </div>
  );
};

export default Login;
