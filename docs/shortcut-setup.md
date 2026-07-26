# HomeIce Apple Shortcut — Share Sheet capture

This Shortcut lets anyone in the family share a photo, text selection, or link
straight into HomeIce's capture pipeline from anywhere on iOS/iPadOS/macOS —
no need to open the app.

## What it does

`Receive input from Share Sheet` → `Get contents of URL` (POST to
`/api/capture` with a shared secret header) → `Show Notification` with the
response, so you get instant confirmation of what was parsed.

## Build it

1. Open the **Shortcuts** app → **+** to create a new shortcut. Name it
   **"Send to HomeIce"**.
2. Tap the **ⓘ** settings icon → enable **"Show in Share Sheet"**. Under
   "Share Sheet Types", check **Images**, **Text**, and **URLs** (leave others
   off — those are the three content types the capture endpoint accepts).
3. Add action **"Receive input"** (search for it) at the top — set it to
   accept **Images, Text, and URLs** and set "if there's no input" to
   **"Continue"**.
4. Add an **"If"** action branching on the input type:
   - **If Shortcut Input has any value and is Image**: add a
     **"Base64 Encode"** action on the image (Encode: `Base64`), producing a
     data-URL-safe string.
   - **Otherwise**: use the text/URL input directly.

   (If you'd rather keep it simple, skip the branch — just add "Base64
   Encode" only when the shared item is an image; for text/URL shares that
   action is skipped automatically since there's nothing to encode.)
5. Add **"Get Contents of URL"**:
   - **URL**: `https://<your-deployment-domain>/api/capture`
   - **Method**: `POST`
   - **Headers**: add a header named `x-capture-secret` with the value of
     your `CAPTURE_SECRET` (ask whoever set up HomeIce for this value — it's
     the same secret configured in Vercel).
   - **Headers**: `Content-Type` = `application/json`
   - **Request Body**: `JSON`, with fields:
     - `type`: `text` normally, or `image` when the branch above detected an
       image (set this via the "If" branch — two separate "Get Contents of
       URL" actions, or a "Text" action beforehand that sets a variable).
     - `content`: the shared text/URL, or for images, `data:image/jpeg;base64,`
       followed by the Base64-encoded string from step 4.
     - `from`: `Shortcut`
6. Add **"Get Dictionary from Input"** (or "Get Dictionary Value" for `status`
   and `outcomes`) on the response of "Get Contents of URL", to read what
   HomeIce parsed.
7. Add **"Show Notification"** with a title like "HomeIce" and body built
   from the response — e.g. "Sent to Inbox for review" when `status` is
   `inbox`, or list the `outcomes[].summary` values when `status` is
   `applied`.

## Using it

Share any photo (a flyer, a schedule screenshot), a text snippet, or a link
from any app → **Share** → **Send to HomeIce**. It lands in the same capture
pipeline as the in-app quick-add box: unambiguous actions (grocery items,
dinner requests, clear events) apply immediately with a notification; bulk or
ambiguous captures land in the **Inbox** tab for a parent to approve.

## Notes

- The shared secret (`x-capture-secret`) is the only auth for this endpoint
  from outside the app — anyone with the Shortcut installed and the secret
  can post captures. Don't share the secret outside the family.
- Photos are sent as base64 inline in the request body — very large images
  (multi-MB, e.g. unedited photos) may exceed the server's request size
  limit. If a photo capture fails, try sharing a screenshot or a resized
  photo instead.
