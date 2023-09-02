import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

/**
 * Get selected attachments
 * @param {bool} all    Get all attachments or only valid attachments (default is false)
 * @returns {array}    Array with attachment ids
 */
export function getSelectedAttachments(
  all: boolean = false,
): string[] | number[] {
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
    // get target folder path from preference
    path = Zotero.Prefs.get("extensions.zotero.baseAttachmentPath", true);
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
