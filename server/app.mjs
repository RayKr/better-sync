// ESM
import Fastify from "fastify";
import shell from "shelljs";
import path from "path";

const app = Fastify({
  logger: true,
});

app.get("/", async (request, reply) => {
  reply.type("application/json").code(200);
  return { hello: "world" };
});

app.post("/api/v1/sync", async (request, reply) => {
  console.log(request.body);
  const items = request.body.items;
  const direction = request.body.direction;
  items.forEach((item) => {
    console.log(item);
    switch (direction) {
      case "stored2linked":
        break;
      case "linked2stored":
        break;
      default:
        autoSync(item.stored_file, item.linked_dir);
    }
  });

  reply.type("application/json").code(200);
  return { code: 200, message: "Success." };
});

app.listen({ port: 12138 }, (err, address) => {
  if (err) throw err;
  // Server is now listening on ${address}
});

function autoSync(stored_file, linked_dir) {
  // check if the file exists
  if (shell.test("-e", stored_file)) {
    // get filename
    const filename = stored_file.split("/").pop();
    const destination = path.join(linked_dir, filename);
    // check existence of the file
    if (shell.test("-e", destination)) {
      // check if the file is a hard link
      if (
        !shell.exec(`find "${linked_dir}" -samefile "${stored_file}"`).stdout
      ) {
        // same filename, different inode, sync linked to stored
        shell.ln("-f", destination, stored_file);
        app.log.info(`Synced [${destination}] to [${stored_file}].`);
      } else {
        app.log.info(
          `Noneed sync, as [${stored_file}] same as [${destination}].`,
        );
      }
    } else {
      // if the file does not exist, sync stored to linked
      shell.ln("-f", stored_file, destination);
      app.log.info(`Synced [${stored_file}] to [${destination}].`);
    }
  } else {
    app.log.error(`Error: ${stored_file} does not exist.`);
    throw `Error: ${stored_file} does not exist.`;
  }
}
