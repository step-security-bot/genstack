import { join, resolve } from "node:path";
import binShim from "@genstack.js/util/bin";

async function execute() {
  await binShim(
    resolve(join(import.meta.dirname, "..", "bin")),
    "memdb",
    process.argv.slice(2),
    {},
    /* includeEnv= */ true,
    /* shell= */ false,
  );
}

execute().then(
  () => {},
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
