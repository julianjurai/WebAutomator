import puppeteer from "puppeteer";
import spoof from "./utils/spoof";
import { isWifiConnected } from "./utils/networkStatus";
import greaseMonkeyScript, { metadata } from "./lib/greaseMonkeyScript";
import { Status } from "./main";

const NEVERSSL = "http://neverssl.com";
const TIMEOUT = 90 * 1000;

const isNetworkConnected = async () => {
  let networkConnected = isWifiConnected();
  let timeout = 20 * 1000;
  let counter = 0;
  let interval;

  if (!networkConnected) {
    await new Promise((resolve, reject) => {
      interval = setInterval(() => {
        counter += 1;
        networkConnected = isWifiConnected();

        if (counter > timeout) {
          throw Error(`Timeout error, network connection not established`);
        }

        if (networkConnected) {
          clearInterval(interval);
          resolve();
        }
      }, 2000);
    });
  }
};

const puppeteerInit = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT);
  return { browser, page };
};

const stringVoke = fn => "(" + fn.toString() + ")()";

const goToNeverSSL = puppeteerPage => puppeteerPage.goto(NEVERSSL);

const injectGreaseMonkeyScript = page => {
  page.on("domcontentloaded", () =>
    page.addScriptTag({ content: stringVoke(greaseMonkeyScript) })
  );
};

const automator = async () => {
  Status.INPROGESS = true;
  await spoof();
  console.log("4. Spoofed: 💨");

  await isNetworkConnected();
  console.log("5. Network Connected 📡");

  const { browser, page } = await puppeteerInit();
  injectGreaseMonkeyScript(page);

  try {
    await goToNeverSSL(page);
    console.log("6. Start Navigation 🔭");

    await browser.waitForTarget(
      target => target.url() === metadata.completedUrl
    );
    console.log("7. Session Restored ✅");

    console.log("🤖  👍");
  } catch (e) {
    console.error("🤢", e);
  } finally {
    await page.close();
    await browser.close();
  }

  Status.INPROGESS = false;
};

export default automator;
