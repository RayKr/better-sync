import { config } from "../../package.json";
import { getString } from "../utils/locale";

export function registerMenu() {
  const menuIcon = `chrome://${config.addonRef}/content/icons/favicon@0.5x.png`;
  ztoolkit.Menu.register("item", {
    tag: "menuseparator",
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "bettersync-itemmenu-sync",
    label: getString("menuitem-autosync-label"),
    commandListener: (ev) => addon.hooks.onMenuClickEvents("manualSync"),
    icon: menuIcon,
  });
}
