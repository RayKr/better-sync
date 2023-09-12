import { config } from "../../package.json";
import { appendStoredAttachments, getSelectedAttachments } from "../utils/file";
import { getPref } from "../utils/prefs";

export function registerShortcuts() {
  //   ztoolkit.Shortcut.register("element", {
  //     id: `${config.addonRef}-translateKey`,
  //     key: "T",
  //     modifiers: "accel",
  //     xulData: {
  //       document,
  //       command: `${config.addonRef}-translateCmd`,
  //       _parentId: `${config.addonRef}-keyset`,
  //       _commandOptions: {
  //         id: `${config.addonRef}-translateCmd`,
  //         document,
  //         _parentId: `${config.addonRef}-cmdset`,
  //         oncommand: `Zotero.${config.addonInstance}.hooks.onShortcuts(Zotero_Tabs.selectedType)`,
  //       },
  //     },
  //   });

  // Register an event key for Alt+L
  ztoolkit.Shortcut.register("event", {
    id: `${config.addonRef}-key-preview`,
    key: "x",
    modifiers: "", // shift work on macOS
    callback: (keyOptions) => {
      addon.hooks.onShortcuts("quicklook");
    },
  });

  document.onkeydown = (e) => {
    ztoolkit.log("onkeydown", e);
    if (e.ctrlKey && e.key == "p") {
      e.preventDefault();
      e.stopPropagation();
      quicklook();
    }
  };

  // window.addEventListener("keypress", (e) => {
  //   ztoolkit.log("keyPress", e);
  // });
}

export function quicklook() {
  const ids = getSelectedAttachments();
  const items: string[] = [];
  appendStoredAttachments(items, ids);
  items.length && _sendQuicklook({ items: items });
}

function _sendQuicklook(data: any) {
  Zotero.HTTP.doPost(
    `${getPref("apiUrl")}/ql`,
    JSON.stringify(data),
    (response: any) => {
      // just show error message
      if (response.status != 200) {
        ztoolkit.log("Error", response);
        new ztoolkit.ProgressWindow(config.addonName).createLine({
          text: response.message,
          type: "error",
        });
        return;
      }
    },
    { "Content-Type": "application/json" },
  );
}
