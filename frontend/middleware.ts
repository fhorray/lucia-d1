import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_session");

  // Se não há token, redirecionar para a página de login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Validar o token com o endpoint de validação
  try {
    const response = await fetch("http://localhost:3001/v1/auth/validate", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const isValid = await response.json();

    if (isValid) {
      // Se a sessão for válida, continue a requisição
      return NextResponse.next();
    } else {
      // Se a sessão for inválida, redirecionar para a página de login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch (error) {
    // Em caso de erro, redirecionar para a página de login
    console.log(error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Aplicar o middleware apenas em rotas específicas
export const config = {
  matcher: ["/"],
};
