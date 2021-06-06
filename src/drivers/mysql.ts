import { MySQL } from "../deps.ts";

type Config = {
  hostname: string;
  password: string;
  username: string;
};

const connections: Record<string, MySQL> = {};

const configToConnectionKey = (config: Config) =>
  `${config.username}:${config.password}@${config.hostname}`;

export const mysqlDriver = async (config: Config, query: string) => {
  const key = configToConnectionKey(config);
  if (!connections[key]) {
    // TODO: timeout and kill the connection if unused
    const connection = await new MySQL().connect(config);

    if (!connections[key]) connections[key] = connection;
  }

  const start = Date.now();
  let data, error;
  try {
    data = await connections[key].execute(query);
  } catch (err) {
    console.error(err);
    error = err;
  }

  const duration = Date.now() - start;

  if (error) return { error: error.message, duration };
  return { duration, ...data };
};
