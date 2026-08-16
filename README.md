# Threads Profile Archiver

A lightweight, zero-dependency browser console script to archive an entire Threads profile into a single, standalone, offline-viewable HTML file.

---

## Features

* **No Installations**: Runs directly inside your browser's Developer Tools console.
* **Virtualized Feed Capture**: Automatically scrolls and captures posts before Threads deletes them from the DOM.
* **Profile Header & Tabs**: Preserves the profile bio, avatar, follower count, and navigation tabs.
* **Deduplication Engine**: Accurately filters out pinned posts and quoted posts from duplicating.
* **Self-Contained Output**: Converts avatars to Base64 and strips hotlinking restrictions, producing a single portable `.html` file.

---

## How to Use

1. Open any Threads profile in your browser (e.g., `https://www.threads.net/@username`).
2. Open Developer Tools (`F12` or `Ctrl + Shift + I` / `Cmd + Option + I`).
3. Switch to the **Console** tab.
4. Copy the entire code from [`threads_scraper.js`](threads_scraper.js) and paste it into the console.
5. Press **Enter**.

---

## Controls & Output

* **Auto-Scroll**: The script will automatically scroll down, stash visible posts, and display a progress counter at the bottom-right.
* **Stop Early**: To finish and download early without scrolling to the very end, run:
  ```js
  stopCapture()
  ```
* **Download**: Once reaching the bottom (or when stopped), a standalone file named `Threads_Archive_<timestamp>.html` will automatically download to your computer.

---

## License

This project is licensed under the [MIT License](LICENSE).
