import { opine, opineCors, Response } from "./deps.ts";
import drivers from "./drivers/index.ts";

const app = opine();

app.use(opineCors());

const port = 3000;

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
      JSON.stringify(resp, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
    res.json(resp);
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _1: unknown, res: Response, _2: unknown) => {
  console.error(err);
  res.setStatus(400);
  res.send(err.message);
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
