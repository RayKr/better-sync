import { config } from "../../package.json";

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
    key: "L",
    modifiers: "accel", // shift work on macOS
    callback: (keyOptions) => {
      ztoolkit.log("==>event", keyOptions);
      addon.hooks.onShortcuts("preview");
    },
  });
}
