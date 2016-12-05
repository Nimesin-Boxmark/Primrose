pliny.namespace({
  name: "Flags",
  description: `Various flags used for feature detecting and configuring the system.

When including Primrose as a \`script\` tag, the Flags namespace is imported directly onto the window object and is available without qualification.`
});

import isChrome from "./isChrome";
import isFirefox from "./isFirefox";
import isGearVR from "./isGearVR";
import isIE from "./isIE";
import isInIFrame from "./isInIFrame";
import isiOS from "./isiOS";
import isMacOS from "./isMacOS";
import isMobile from "./isMobile";
import isOpera from "./isOpera";
import isSafari from "./isSafari";
import isWebKit from "./isWebKit";
import isWindows from "./isWindows";

export {
  isChrome,
  isFirefox,
  isGearVR,
  isIE,
  isInIFrame,
  isiOS,
  isMacOS,
  isMobile,
  isOpera,
  isSafari,
  isWebKit,
  isWindows
};

export default {
  isChrome,
  isFirefox,
  isGearVR,
  isIE,
  isInIFrame,
  isiOS,
  isMacOS,
  isMobile,
  isOpera,
  isSafari,
  isWebKit,
  isWindows
};