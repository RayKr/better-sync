import { getPref } from "../utils/prefs";
import { getString } from "../utils/locale";

/**
 * Get selected attachments
 * @returns {array}    Array with attachment ids
 */
export function getSelectedAttachments(): number[] {
  // get selected items
  let attachments: Array<any> = ZoteroPane.getSelectedItems()
    .map((item: any) => (item.isRegularItem() ? item.getAttachments() : [item]))
    .reduce((a: any, b: any) => a.concat(b), [])
    .map((item: any) =>
      typeof item == "number" ? Zotero.Items.get(item) : item,
    )
    .filter((item: any) => item.isAttachment())
    .filter(
      (att: any) =>
        att.attachmentLinkMode !== Zotero.Attachments.LINK_MODE_LINKED_URL,
    )
    .map((att: any) => att.id);
  // remove duplicate elements
  if (attachments.length > 0)
    attachments = Zotero.Utilities.arrayUnique(attachments);
  // return array with attachment ids
  return attachments;
}

export function checkFileType(att: any) {
  if (!getPref("useFileTypes")) return true;
  const pos = att.attachmentFilename.lastIndexOf("."),
    filetype =
      pos == -1 ? "" : att.attachmentFilename.substr(pos + 1).toLowerCase(),
    regex =
      getPref("filetypes")?.toString().toLowerCase().replace(/,/gi, "|") ?? "";
  // return value
  return filetype.search(new RegExp(regex)) >= 0 ? true : false;
}

/**
 * Returns the base attachment path for syncing attachments.
 * @returns {string} The base attachment path.
 * @throws {Error} If the base attachment path is not set.
 */
export function getBaseAttachmentPath(): string {
  let path;
  // if use zotero default folder
  const useDefault = getPref("useDefaultBasePath");
  if (useDefault) {
    // get target folder path from preference
    path = Zotero.Prefs.get("extensions.zotero.baseAttachmentPath", true);
  } else {
    path = getPref("baseAttachmentPath");
  }
  if (!path) {
    // TODO show error message
    const msg = getString("error-needs-base-path");
    ztoolkit.log("BetterSync", msg);
    throw new Error(msg);
  }
  if (typeof path !== "string") {
    // TODO show error message
    const msg = getString("error-base-path-not-string");
    ztoolkit.log("BetterSync", msg);
    throw new Error(msg);
  }

  return path;
}

/**
 * Returns the subfolder paths for the given attachment.
 * @param {Zotero.Item} att The attachment.
 * @returns {string[]} The subfolder paths.
 */
function getSubfolderPaths(att: Zotero.Item): string[] {
  const collectionPaths: string[] = [];
  const folderSep = Zotero.isWin ? "\\" : "/";

  // get nested collection paths
  function _getCollectionPath(collectionID: number): any {
    const collection = Zotero.Collections.get(
      collectionID,
    ) as Zotero.Collection;
    if (!collection.parentID) {
      return collection.name;
    }

    return (
      _getCollectionPath(collection.parentID) + folderSep + collection.name
    );
  }

  const item = att.parentItem;
  ztoolkit.log("===>父item为", item);
  if (!item) return [];

  const name = getItemDisplayName(item);

  item.getCollections().forEach((collectionID) => {
    collectionPaths.push(_getCollectionPath(collectionID) + folderSep + name);
  });

  return collectionPaths;
}

function getItemDisplayName(item: Zotero.Item) {
  switch (item.itemType) {
    case "case":
      return item.getField("caseName");
    default:
      return item.getField("title");
  }
}

export function appendAttachments(
  items: { stored_file: string; linked_dir: string }[],
  ids: string[] | number[],
) {
  Zotero.Items.get(ids).forEach((att) => {
    if (att.isAttachment()) {
      const subfolders = getSubfolderPaths(att);
      // get attachment path
      const att_path = att.getFilePath() as string;
      subfolders.forEach((subfolder) => {
        items.push({
          stored_file: att_path,
          linked_dir: subfolder,
        });
      });
    }
    if (att.isRegularItem()) {
      appendAttachments(items, att.getAttachments());
    }
  });
}

export function appendStoredAttachments(
  items: string[],
  ids: string[] | number[],
) {
  Zotero.Items.get(ids).forEach((att) => {
    if (att.isAttachment()) {
      // get attachment path
      const att_path = att.getFilePath() as string;
      items.push(att_path);
    }
    if (att.isRegularItem()) {
      appendStoredAttachments(items, att.getAttachments());
    }
  });
}
