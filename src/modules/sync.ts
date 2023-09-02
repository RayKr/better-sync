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
  }

  /**
   * Sync linked data to stored data
   */
  static syncLinked2Stored() {}

  static manualSync() {
    ztoolkit.log("manualSync", "Started.");
    const ids = getSelectedAttachments();
    this.autoSync(ids);
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
    // auto sync stored file attachments
    if (atts.length > 0) BetterSyncApi.sync(atts);
  }
}

class BetterSyncApi {
  static sync(atts: Zotero.Item[]) {
    const folderSep = Zotero.isWin ? "\\" : "/";
    const items: { stored_file: string; linked_dir: string }[] = [];
    const linked_dir = getBaseAttachmentPath();
    atts.forEach((att) => {
      const subfolders = getSubfolderPaths(att);
      // get attachment path
      const att_path = att.getFilePath() as string;

      subfolders.forEach((subfolder) => {
        items.push({
          stored_file: att_path,
          linked_dir: linked_dir + folderSep + subfolder,
        });
      });
    });

    const data = { direction: "auto", items: items };

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

function getSubfolderPaths(att: Zotero.Item): string[] {
  const collectionPaths: string[] = [];
  const folderSep = Zotero.isWin ? "\\" : "/";

  // get nested collection paths
  function _getCollectionPath(collectionID: number): any {
    const collection = Zotero.Collections.get(
      collectionID,
    ) as Zotero.Collection;
    ztoolkit.log(
      "【collection】",
      collection,
      collection.parentID,
      collection.name,
      typeof collection.parentID,
    );
    if (!collection.parentID) {
      ztoolkit.log("【collection.name】", collection.name);
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
