# MeterMate

A small web app for splitting one electricity bill between two shops when only one shop has a sub-meter.

## Use it

Open `index.html` in a modern browser, or publish the app using the steps below and open its web address on your phone. Enter the billing month, the main meter's total units used this month, your shop's previous and current sub-meter readings, and the full bill amount in rupees.

- Your shop's units are calculated from its sub-meter.
- The other shop's units are the main-meter usage minus your shop's units.
- The bill is split in proportion to those units, with rounding arranged so both shares add up to the total bill.
- The current entry saves automatically in this browser and returns when you open the app again.
- Select **Save month** to also add a completed bill to the saved-month history, or **Download bill image** to create a shareable JPG.

## Put it on GitHub and publish it with Vercel

1. Sign in to [GitHub](https://github.com) and create a new repository. Choose either **Public** or **Private**. For a private repo, connect Vercel to GitHub and grant it access to this repository.
2. In the new repository, choose **Add file → Upload files**. Upload the app files from this folder directly (including `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `icon.svg`, `pwa.js`, and `sw.js`), then commit the upload.
3. Sign in to [Vercel](https://vercel.com) with GitHub and select **Add New → Project**. Import the new repository.
4. In project settings, keep the root directory as the repository root. Choose **Other** as the framework preset; no build command is needed and set the output directory to `.`. Deploy.
5. Open the Vercel URL on your phone. On Android, use the browser menu's **Install app** or **Add to Home screen** option. On iPhone, open the URL in Safari and choose **Share → Add to Home Screen**.

The static app works offline after it has first loaded successfully and its service worker has cached the app files. Each browser/device keeps its current entry and saved bills in local storage; they do not sync between phones. Meter readings are not sent to a server.
