import { Hono } from "hono";
import { Bindings, Variables } from "../bindings";

const usersRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

usersRouter.get("/@me", async (c) => {
  const user = c.get("user");
  console.log(user);
  if (!user) {
    return c.json({ data: "Not found" });
  }

  return c.json({ user });
});

export default usersRouter;
