import { Hono } from "hono";

import { Bindings, Variables } from "./bindings";
import { drizzle } from "drizzle-orm/d1";
import { users } from "./db/schemas";
import { csrf } from "hono/csrf";
import auth from "./routes/auth";
import posts from "./routes/posts";
import usersRoute from "./routes/users";
import { cors } from "hono/cors";
import { autMiddleware } from "./middlewares";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath(
  "/v1"
);

app.use("*", autMiddleware);

app.use(
  "/*",
  cors({
    origin: "http://localhost:3000", // Permita seu frontend
    allowMethods: ["GET", "POST", "OPTIONS"], // Métodos permitidos
    allowHeaders: ["Content-Type", "Authorization"], // Cabeçalhos permitidos
    credentials: true, // Habilitar envio de credenciais (cookies, headers, etc)
  })
);

app.use(csrf());

app.get("/", async (c) => {
  return c.json({ test: "test" });
});

app.route("/auth", auth);
app.route("/posts", posts);
app.route("/users", usersRoute);

export default app;
