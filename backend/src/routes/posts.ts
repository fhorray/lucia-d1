import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { drizzle } from "drizzle-orm/d1";
import { Bindings, Variables } from "../bindings";
import { SelectPost } from "../db/schemas";
import { getPosts, insertPost } from "../functions/posts";

const postsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

postsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ data: "Not found" });
  }

  const db = drizzle(c.env.DB);

  const results: SelectPost[] = await getPosts(db, user.id);

  return c.json({ results });
});

postsRouter.post(
  "/",
  zValidator(
    "form",
    z.object({
      title: z.string().min(1).max(255),
      content: z.string().min(1).max(999),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const db = drizzle(c.env.DB);
    const { title, content } = c.req.valid("form");

    const post = await insertPost(db, { title, content, authorId: user.id });
    if (!post) {
      return c.json({ data: "Not found" });
    }

    return c.json({});
  }
);

export default postsRouter;
