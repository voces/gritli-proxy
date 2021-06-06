import { mysqlDriver } from "./mysql.ts";

const drivers = {
  mysql: mysqlDriver,
};

type Config = {
  driver: "mysql";
  hostname: string;
  password: string;
  username: string;
};

export default async ({ driver, ...config }: Config, query: string) => {
  if (drivers[driver]) {
    return await drivers[driver](config, query);
  }

  throw new Error(`Unknown driver ${driver}`);
};
