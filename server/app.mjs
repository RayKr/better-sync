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
  if (!items || !event || !base_path) {
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
    switch (event) {
      case "modify": // modify linked to stored
        modifySync(counts, item.stored_file, item.linked_dir, base_path);
        break;
      case "trash": // move to trash
      case "delete": // delete permanently
        trashSync(counts, item.stored_file, item.linked_dir, base_path);
        break;
      case "add": // add stored to linked
      case "sync": // sync stored to linked
        autoSync(counts, item.stored_file, item.linked_dir, base_path);
        break;
      default:
        return { code: 500, message: "Not support event." };
    }
  });

  reply.type("application/json").code(200);
  console.log(counts);
  return { code: 200, message: "Success.", data: counts };
});

app.listen({ port: 12138 }, (err, address) => {
  if (err) throw err;
  // Server is now listening on ${address}
});

/**
 * Modifies the synchronization of a file by deleting all files with the same inode as the stored file except for the linked file, and then recreating the symbolic link.
 * @param {Object} counts - An object containing the counts of added, removed, and updated files.
 * @param {string} stored_file - The path of the stored file.
 * @param {string} linked_dir - The path of the linked directory.
 * @param {string} base_path - The base path of the files.
 */
function modifySync(counts, stored_file, linked_dir, base_path) {
  // get filename
  const filename = stored_file.split("/").pop();
  const destination = path.join(base_path, linked_dir, filename);
  // 在base_path下查找所有samefile
  const same_inode_files = getSameInodeFiles(base_path, "", stored_file);
  // // 删除所有same_inode_files
  // shell.rm("-f", same_inode_files);
  // counts["removed"] += same_inode_files.length;
  // 重建ln
  shell.ln("-f", stored_file, destination);
  counts["stored2linked"] += 1;
}

/**
 * Deletes a file from a linked directory and removes empty directories if necessary.
 * @param {Object} counts - An object containing counts of added, updated, and removed files.
 * @param {string} stored_file - The path of the file to be deleted.
 * @param {string} linked_dir - The path of the linked directory where the file is stored.
 * @param {string} base_path - The base path of the linked directory.
 */
function trashSync(counts, stored_file, linked_dir, base_path) {
  // get filename
  const filename = stored_file.split("/").pop();
  const destination = path.join(base_path, linked_dir, filename);
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

/**
 * Syncs a file between a stored location and a linked directory.
 * @param {Object} counts - An object containing counts of linked2stored, stored2linked, and skipped files.
 * @param {string} stored_file - The path to the stored file.
 * @param {string} linked_dir - The path to the linked directory.
 * @param {string} base_path - The base path for the linked directory.
 * @throws Will throw an error if the stored file does not exist.
 */
function autoSync(counts, stored_file, linked_dir, base_path) {
  // check if the file exists
  if (shell.test("-e", stored_file)) {
    // get filename
    const filename = stored_file.split("/").pop();
    const destination = path.join(base_path, linked_dir, filename);
    // check if the directory exists
    if (!shell.test("-e", path.join(base_path, linked_dir))) {
      shell.mkdir("-p", path.join(base_path, linked_dir));
    }
    // check existence of same inode files
    _removeDuplicatedFiles(linked_dir, stored_file, base_path);

    // check existence of the file
    if (shell.test("-e", destination)) {
      // check if the file is a hard link
      if (!getSameInodeFiles(base_path, linked_dir, stored_file).length) {
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

function sync(counts, stored_file, linked_dir, base_path) {}

function inverseSync(counts, stored_file, linked_dir, base_path) {}

/**
 * Removes duplicated files from a linked directory.
 * @param {string} linked_dir - The linked directory path.
 * @param {string} stored_file - The stored file path.
 * @param {string} base_path - The base path of the stored file.
 */
function _removeDuplicatedFiles(linked_dir, stored_file, base_path) {
  const filename = stored_file.split("/").pop();
  const destination = path.join(base_path, linked_dir, filename);
  const same_inode_files = getSameInodeFiles(
    base_path,
    linked_dir,
    stored_file,
  );
  same_inode_files.forEach((file) => {
    // delete different filename files
    if (file !== destination) {
      shell.rm("-f", file);
    }
  });
}

/**
 * Returns an array of file paths that have the same inode as the given stored file.
 * @param {string} base_path - The base path of the linked directory.
 * @param {string} linked_dir - The name of the linked directory.
 * @param {string} stored_file - The path of the stored file.
 * @returns {string[]} An array of file paths that have the same inode as the given stored file.
 */
function getSameInodeFiles(base_path, linked_dir, stored_file) {
  const files = shell
    .exec(
      `find "${path.join(base_path, linked_dir)}" -samefile "${stored_file}"`,
    )
    .stdout.split("\n");
  files.pop();
  return files;
}
