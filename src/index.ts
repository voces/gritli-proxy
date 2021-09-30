import { DenoResponseBody, opine, opineCors, Response } from "./deps.ts";
import drivers from "./drivers/index.ts";

const port = 3000;

const app = opine();

app.use(opineCors());

app.use((req, res, next) => {
  const start = Date.now();
  const oldEnd = res.end;
  const newEnd: typeof oldEnd =
    ((async (body: DenoResponseBody | undefined) => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${duration}ms - ${req.ip}`);
      if (body) await oldEnd.call(res, body);
      else await oldEnd.apply(res);
      // deno-lint-ignore no-explicit-any
    }) as any);
  res.end = newEnd;
  next();
});

app.get("/", async (req, res, next) => {
  if (typeof req.query.config !== "string") {
    res.setStatus(400);
    res.send({ message: "expect config to be a string" });
    return;
  }

  let config;
  try {
    config = JSON.parse(req.query.config);
  } catch {
    res.setStatus(400);
    res.send({ message: "expect config to be json" });
    return;
  }
  const query = req.query.query;

  if (typeof query !== "string") {
    res.setStatus(400);
    res.send({ message: "expect query to be a string" });
    return;
  }

  try {
    const resp = await drivers(config, query);
    res.set("Cache-Control", "max-age=86400");
    res.set("Content-Type", "application/json");
    res.send(
      JSON.stringify(
        resp,
        (_, value) => typeof value === "bigint" ? value.toString() : value,
      ),
    );
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: unknown, res: Response, _next: unknown) => {
  console.error(err);
  res.setStatus(400);
  res.send(err.message);
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
