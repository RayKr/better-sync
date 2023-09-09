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
  const event = request.body.event;
  const base_path = request.body.base_path;
  if (
    !items ||
    !event ||
    (!base_path && (event == "trash" || event == "modify"))
  ) {
    return { code: 500, message: "Missing parameters." };
  }

  const counts = {
    stored2linked: 0,
    linked2stored: 0,
    skipped: 0,
    removed: 0,
    modified: 0,
  };
  items.forEach((item) => {
    console.log(item, event);
    let rst;
    switch (event) {
      case "modify": // modify linked to stored
        modifySync(counts, item.stored_file, item.linked_dir, base_path);
        break;
      case "trash": // remove linked
        trashSync(counts, item.stored_file, item.linked_dir, base_path);
        break;
      case "add": // add stored to linked
      case "sync": // sync stored to linked
        autoSync(counts, item.stored_file, item.linked_dir);
        break;
      default:
        return { code: 500, message: "Not support event." };
    }
  });

  reply.type("application/json").code(200);
  return { code: 200, message: "Success.", data: counts };
});

app.listen({ port: 12138 }, (err, address) => {
  if (err) throw err;
  // Server is now listening on ${address}
});

function modifySync(counts, stored_file, linked_dir, base_path) {
  // get filename
  const filename = stored_file.split("/").pop();
  const destination = path.join(linked_dir, filename);
  // 在base_path下查找所有samefile
  const same_inode_files = shell
    .exec(`find "${base_path}" -samefile "${stored_file}"`)
    .stdout.split("\n");
  // 删除所有samefile
  same_inode_files.pop();
  same_inode_files.forEach((file) => {
    // delete different filename files
    if (file !== destination) {
      shell.rm("-f", file);
      counts["removed"] += 1;
    }
  });
  // 重建ln
  autoSync(counts, stored_file, linked_dir);
}

function trashSync(counts, stored_file, linked_dir, base_path) {
  // get filename
  const filename = stored_file.split("/").pop();
  const destination = path.join(linked_dir, filename);
  // del file
  shell.rm("-f", destination);
  // After deleting the file, if the folder is empty, delete the folders layer by layer.
  let dir = linked_dir;
  while (dir !== base_path) {
    dir = path.dirname(dir);
    if (shell.ls(dir).length === 0) {
      shell.rm("-rf", dir);
    } else {
      break;
    }
  }
  counts["removed"] += 1;
}

function autoSync(counts, stored_file, linked_dir) {
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
        shell.ln("-f", destination, stored_file);
        counts["linked2stored"] += 1;
      } else {
        // same filename, same inode, skip
        counts["skipped"] += 1;
      }
    } else {
      // if the file does not exist, sync stored to linked
      shell.ln("-f", stored_file, destination);
      counts["stored2linked"] += 1;
    }
  } else {
    app.log.error(`Error: ${stored_file} does not exist.`);
    throw `Error: ${stored_file} does not exist.`;
  }
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
  same_inode_files.pop();
  same_inode_files.forEach((file) => {
    // delete different filename files
    if (file !== destination) {
      shell.rm("-f", file);
      app.log.info(`[BetterSync] Removed [${file}].`);
    }
  });
}
