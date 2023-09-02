// 引入shelljs
import {
  checkFileType,
  getBaseAttachmentPath,
  getSelectedAttachments,
} from "../utils/file";
import { getPref } from "../utils/prefs";

export class BetterSync {
  /**
   * Sync stored data to linked data
   */
  static syncStored2Linked() {
    ztoolkit.log("syncStored2Linked", "Started.");
    console.log("syncStored2Linked", "Started.");
    const a = getSelectedAttachments();
    // ztoolkit.log("syncStored2Linked", a);
    // get selected attachments
    // const atts = Zotero.Items.get(a);
    // // show infoWindow %
    // const pw = new ztoolkit.ProgressWindow("BetterSync");
    // pw.createLine({
    //   type: "success",
    //   text: "Finish",
    //   progress: 100,
    // }).show();

    // atts.forEach((att) => {
    //   // get attachment path
    //   if (!att.fileExists() || att.isTopLevelItem()) {
    //     // TODO show error message
    //   } else {
    //     // get attachment path
    //     const att_path = att.getFilePath() as string;
    //     const target_folder = getBaseAttachmentPath();
    //     // create hard link
    //     createHardLink(att_path, target_folder);
    //   }
    // });
  }

  /**
   * Sync linked data to stored data
   */
  static syncLinked2Stored() {}

  static manualSync() {
    ztoolkit.log("manualSync", "Started.");
    const atts = Zotero.Items.get(getSelectedAttachments());
    ztoolkit.log("manualSync", atts);
    if (atts.length > 0) BetterSyncApi.autoSync(atts);
  }

  /**
   * Sync data
   */
  static autoSync(ids: number[] | string[]) {
    // retrieve the added/modified items
    const atts = Zotero.Items.get(ids)
      .filter(
        (att) =>
          att.isStoredFileAttachment() &&
          !att.isTopLevelItem() &&
          att.fileExists(),
      )
      .filter(checkFileType);
    console.log(atts);
    // auto sync stored file attachments
    if (atts.length > 0) BetterSyncApi.autoSync(atts);
  }
}

class BetterSyncApi {
  static autoSync(atts: Zotero.Item[]) {
    const items: { stored_file: string; linked_dir: string }[] = [];
    const linked_dir = getBaseAttachmentPath();
    atts.forEach((att) => {
      // get attachment path
      const att_path = att.getFilePath() as string;
      items.push({
        stored_file: att_path,
        linked_dir: linked_dir,
      });
    });

    const data = { direction: "auto", items: items };

    ztoolkit.log(JSON.stringify(data));
    ztoolkit.log(`${getPref("apiUrl")}/sync`);
    ztoolkit.log(Zotero.HTTP.doPost);
    Zotero.HTTP.doPost(
      `${getPref("apiUrl")}/sync`,
      JSON.stringify(data),
      (response: any) => {
        ztoolkit.log(response);
      },
      "application/json",
    );
  }
}
