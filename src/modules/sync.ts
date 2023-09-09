import { getPref } from "../utils/prefs";
import { config } from "../../package.json";
import { getString } from "../utils/locale";

const folderSep = Zotero.isWin ? "\\" : "/";

export class BetterSync {
  /**
   * Sync stored data to linked data
   */
  static syncStored2Linked() {
    ztoolkit.log("syncStored2Linked", "Started.");
  }

  /**
   * Sync linked data to stored data
   */
  static syncLinked2Stored() {}

  static manualSync() {
    const ids = getSelectedAttachments();
    this.autoSync("sync", "item", ids, {}, true);
  }

  /**
   * Sync data
   */
  static autoSync(
    event: string,
    type: string,
    ids: string[] | number[],
    extraData: { [key: string]: any },
    showMsg: boolean = false,
  ) {
    ztoolkit.log(`autoSync ${event} ${type} ${ids}`, "Started.");

    // TODO modify还暂时不支持

    Zotero.Items.get(ids).forEach((item) => {
      ztoolkit.log("item=", item);
      ztoolkit.log("item.isAttachment()=", item.isAttachment());
      ztoolkit.log("id", item.id);
    });

    const atts = Zotero.Items.get(ids)
      .filter((att) => att.isAttachment())
      .filter(checkFileType);
    if (event == "add") {
      atts.filter((att) => att.fileExists());
    }

    ztoolkit.log(atts, "Attachments to sync.");

    // auto sync stored file attachments
    if (!atts.length) return;

    const items: { stored_file: string; linked_dir: string }[] = [];
    const basePath = getBaseAttachmentPath();
    atts.forEach((att) => {
      const subfolders = getSubfolderPaths(att);
      // get attachment path
      const att_path = att.getFilePath() as string;

      subfolders.forEach((subfolder) => {
        items.push({
          stored_file: att_path,
          linked_dir: basePath + folderSep + subfolder,
        });
      });
    });
    // 在前端判断是应该添加，还是删除重建，还是直接删除，而不应该是在后端判断
    const data = { event: event, items: items, base_path: basePath };
    // request sync server
    _syncPost(data, showMsg);
  }
}

// ************************************** Request ************************************** //

function _syncPost(data: any, showMsg: boolean = false) {
  Zotero.HTTP.doPost(
    `${getPref("apiUrl")}/sync`,
    JSON.stringify(data),
    (response: any) => {
      response = JSON.parse(response.response);
      const type = response.code == 200 ? "success" : "error";
      const stored2linked = response.data ? response.data.stored2linked : 0,
        linked2stored = response.data ? response.data.linked2stored : 0,
        skipped = response.data ? response.data.skipped : 0,
        modified = response.data ? response.data.modified : 0,
        removed = response.data ? response.data.removed : 0;

      if (showMsg) {
        new ztoolkit.ProgressWindow(config.addonName)
          .createLine({
            text: `[${stored2linked}/${linked2stored}/${skipped}/${modified}/${removed}] Better Sync succeeded.`,
            type: type,
            progress: 100,
          })
          .show();
      }
    },
    { "Content-Type": "application/json" },
  );
}

Zotero.Server.Endpoints["/better-sync/sync"] = class {
  public supportedMethods = ["GET", "POST"];
  public OK = 200;
  public SERVER_ERROR = 500;

  public async init(request: { query: any }) {
    ztoolkit.log("====>init", "Started.");
    const options = request.query || {};

    if (options.probe) return [this.OK, "text/plain", "ready"];

    // try {
    //   const citation = options.selected
    //     ? await selected(options)
    //     : await pick(options);

    //   if (options.texstudio) {
    //     if (!TeXstudio.enabled)
    //       return [this.SERVER_ERROR, "application/text", "TeXstudio not found"];
    //     await TeXstudio.push(citation);
    //   }

    //   if (options.clipboard) toClipboard(citation);

    //   return [this.OK, "text/html; charset=utf-8", citation];
    // } catch (err) {
    //   log.error("CAYW request failed:", options, err);
    //   flash("CAYW Failed", err.message);
    //   return [
    //     this.SERVER_ERROR,
    //     "application/text",
    //     `CAYW failed: ${err.message}\n${err.stack}`,
    //   ];
    // }
  }
};

// ************************************** Tools ************************************** //

/**
 * Get selected attachments
 * @returns {array}    Array with attachment ids
 */
export function getSelectedAttachments(): string[] | number[] {
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
  if (!item) return [];

  item.getCollections().forEach((collectionID) => {
    collectionPaths.push(
      _getCollectionPath(collectionID) + folderSep + item.getField("title"),
    );
  });

  return collectionPaths;
}
