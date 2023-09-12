import { getPref } from "../utils/prefs";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import {
  appendAttachments,
  getBaseAttachmentPath,
  getSelectedAttachments,
} from "../utils/file";

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
    this.autoSync("auto", "item", ids, {}, true);
  }

  /**
   * Sync data
   */
  static autoSync(
    event: string,
    type: string,
    ids: number[] | string[],
    extraData: { [key: string]: any },
    showMsg: boolean = false,
  ) {
    ztoolkit.log(`AutoSync Started:`, event, type, ids, extraData);

    // solve: modify skip
    ids = ids.filter((id) => !extraData[id]?.skipSelect) as number[];
    if (ids.length == 0) {
      ztoolkit.log("AutoSync Finished:", ids);
      return;
    }

    const basePath = getBaseAttachmentPath();
    const items: { stored_file: string; linked_dir: string }[] = [];
    appendAttachments(items, ids);
    ztoolkit.log("AutoSync Items:", items);

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
      const forward = response.data ? response.data.forward : 0,
        inverse = response.data ? response.data.inverse : 0,
        skipped = response.data ? response.data.skipped : 0,
        removed = response.data ? response.data.removed : 0;

      if (showMsg) {
        new ztoolkit.ProgressWindow(config.addonName)
          .createLine({
            text: `Better Sync succeeded.`,
            type: type,
            progress: 100,
          })
          .createLine({
            text: `Forward: ${forward}`,
            type: type,
            progress: 100,
          })
          .createLine({
            text: `Inverse: ${inverse}`,
            type: type,
            progress: 100,
          })
          .createLine({
            text: `Skipped: ${skipped}`,
            type: type,
            progress: 100,
          })
          .createLine({
            text: `Removed: ${removed}`,
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
