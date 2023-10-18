const { randomBytes } = require("crypto");
const { default: migrate } = require("node-pg-migrate");
const format = require("pg-format");
const pool = require("../../pool");

const DEFAULT_OPS = {
  host: "localhost",
  port: 5432,
  database: "socialnetwork-test",
  user: "postgres",
  password: "codename",
};

class Context {
  static async build() {
    const roleName = "a" + randomBytes(4).toString("hex");
    await pool.connect(DEFAULT_OPS);

    await pool.query(
      format("CREATE ROLE %I WITH LOGIN PASSWORD %L;", roleName, roleName)
    );

    await pool.query(
      format("CREATE SCHEMA %I AUTHORIZATION %I;", roleName, roleName)
    );

    await pool.close();

    await migrate({
      schema: roleName,
      direction: "up",
      log: () => {},
      noLock: true,
      dir: "migrations",
      databaseUrl: {
        host: "localhost",
        port: 5432,
        database: "socialnetwork-test",
        user: roleName,
        password: roleName,
      },
    });

    await pool.connect(DEFAULT_OPS);

    return new Context(roleName);
  }
  constructor(roleName) {
    this.roleName = roleName;
  }

  async reset() {
    return pool.query(`DELETE FROM users`);
  }
  async close() {
    //Disconnect as pg
    await pool.close();
    //Reconnect as our root user
    await pool.connect(DEFAULT_OPS);
    //Delete role and schema
    await pool.query(format("DROP SCHEMA %I CASCADE;", this.roleName));
    await pool.query(format("DROP ROLE %I;", this.roleName));
    // disconnect again

    await pool.close();
  }
}

module.exports = Context;
