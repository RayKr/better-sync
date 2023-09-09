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
  const counts = {
    stored2linked: 0,
    linked2stored: 0,
    skipped: 0,
  };
  items.forEach((item) => {
    console.log(item);
    let rst;
    switch (direction) {
      case "update": // update linked to stored
        break;
      case "remove": // remove linked
        break;
      case "move": // move linked to a new location
        break;
      case "sync": // sync stored to linked
      default:
        rst = autoSync(item.stored_file, item.linked_dir);
        counts[rst.direction] += rst.num;
    }
  });

  reply.type("application/json").code(200);
  return { code: 200, message: "Success.", data: counts };
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
    // check if the directory exists
    if (!shell.test("-e", linked_dir)) {
      shell.mkdir("-p", linked_dir);
    }
    // check existence of same inode files
    _removeDuplicatedFiles(linked_dir, stored_file);

    // check existence of the file
    if (shell.test("-e", destination)) {
      // check if the file is a hard link
      if (
        !shell.exec(`find "${linked_dir}" -samefile "${stored_file}"`).stdout
      ) {
        // same filename, different inode, sync linked to stored
        return _lnLinked2Stored(destination, stored_file);
      } else {
        return _lnSkip(stored_file, destination);
      }
    } else {
      // if the file does not exist, sync stored to linked
      return _lnStored2Linked(stored_file, destination);
    }
  } else {
    app.log.error(`Error: ${stored_file} does not exist.`);
    throw `Error: ${stored_file} does not exist.`;
  }
}

function _lnStored2Linked(stored, linked) {
  _forceLink(stored, linked);
  return { num: 1, direction: "stored2linked" };
}

function _lnLinked2Stored(linked, stored) {
  _forceLink(linked, stored);
  return { num: 1, direction: "linked2stored" };
}

function _lnSkip(stored, linked) {
  app.log.info(`[BetterSync] Skipped, as [${stored}] same as [${linked}].`);
  return { num: 1, direction: "skipped" };
}

function _forceLink(source, destination) {
  shell.ln("-f", source, destination);
  app.log.info(`[BetterSync] [${source}] to [${destination}].`);
}

/**
 * Removes duplicated files with the same inode as the stored file.
 * @param {string} linked_dir - The directory where the linked file is located.
 * @param {string} stored_file - The path to the stored file.
 */
function _removeDuplicatedFiles(linked_dir, stored_file) {
  const filename = stored_file.split("/").pop();
  const destination = path.join(linked_dir, filename);
  const same_inode_files = shell
    .exec(`find "${linked_dir}" -samefile "${stored_file}"`)
    .stdout.split("\n");
  console.log(same_inode_files);
  same_inode_files.pop();
  same_inode_files.forEach((file) => {
    // delete different filename files
    if (file !== destination) {
      shell.rm("-f", file);
      app.log.info(`[BetterSync] Removed [${file}].`);
    }
  });
}
