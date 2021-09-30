import { ExecuteResult, MySQL } from "../deps.ts";

type Config = {
  hostname: string;
  password: string;
  username: string;
};

const pools: Record<string, MySQL[] | undefined> = {};

const configToConnectionKey = (config: Config) =>
  `${config.username}:${config.password}@${config.hostname}`;

class TimeoutError extends Error {
  message = "Timeout";
}

const wait = (time: number): Promise<never> =>
  new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError()), time);
  });

const timebox = <T>(promise: Promise<T>, time: number) =>
  Promise.race([promise, wait(time)]);

setInterval(() => {
  try {
    for (const key in pools) {
      const pool = pools[key];
      if (pool) {
        if (pool.length) pool.pop();
        if (pool.length === 0) delete pools[key];
      }
    }
  } catch (err) {
    console.error(err);
  }
}, 60_000);

export const mysqlDriver = async (
  config: Config,
  query: string,
  retried = false,
): Promise<
  { duration: number } & (ExecuteResult | { error: Error })
> => {
  const key = configToConnectionKey(config);

  let pool = pools[key];

  if (!pool || !pool.length) {
    if (!pool) {
      pool = pools[key] = [];
    }

    const connection = await timebox(new MySQL().connect(config), 500).catch(
      (err) => err,
    );

    if (connection instanceof Error) {
      return ({ duration: 0, error: connection });
    }

    pool.push(connection);
  }

  const connection = pool.pop()!;

  const start = Date.now();
  let data, error;
  try {
    data = await timebox(connection.execute(query), 60_000);
    pool.push(connection);
  } catch (err) {
    console.error(err);
    error = err;
    if (
      err instanceof Deno.errors.ConnectionRefused ||
      err instanceof Deno.errors.ConnectionAborted ||
      err instanceof Deno.errors.ConnectionReset
    ) {
      if (err instanceof Deno.errors.ConnectionReset && !retried) {
        return mysqlDriver(config, query, true);
      }
    }
  }

  const duration = Date.now() - start;

  if (error) return { error: error.message, duration };
  return { duration, ...data };
};
