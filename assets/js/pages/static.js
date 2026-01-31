import { initCommon } from "../app.js";

// Static pages: keep theme + nav behaviour, but no announcement bar.
await initCommon({ loadAnnouncement:false });
