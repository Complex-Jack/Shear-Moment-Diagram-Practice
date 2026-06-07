# Deploy Shear-Moment Practice to Canvas with GitHub Pages

This widget is a static website. It does not require a server, database, build command, or external JavaScript library.

## Files Required on GitHub

Keep these files together inside the `shear-moment-student` folder:

- `index.html`
- `app.js`
- `styles.css`
- `.nojekyll`

The widget URL will be:

```text
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY_NAME/shear-moment-student/
```

## Enable GitHub Pages

1. Create or open the GitHub repository used for your student widgets.
2. Upload or commit the entire `shear-moment-student` folder.
3. Open the repository's **Settings**.
4. Select **Pages**.
5. Under **Build and deployment**, select:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Save the settings.
7. Wait for GitHub Pages to publish the site.
8. Open the widget URL and confirm the randomized beam problem loads.

## Embed in Canvas

1. Create or edit a Canvas Page.
2. Open the Canvas HTML editor.
3. Paste the following iframe.
4. Replace the `src` value with your GitHub Pages widget URL.

```html
<iframe
  src="https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY_NAME/shear-moment-student/"
  title="Shear-Moment Student Practice"
  width="100%"
  height="1200"
  style="width: 100%; min-height: 1200px; border: 0;"
  loading="lazy"
  allowfullscreen
></iframe>
```

## Updating the Widget

Push revised versions of `index.html`, `app.js`, or `styles.css` to GitHub. GitHub Pages normally republishes changes within a few minutes.

Students may need to refresh the Canvas Page to receive the updated version.

## Troubleshooting

- The repository or GitHub Pages site must be publicly accessible unless your institution supports authenticated private Pages.
- If Canvas blocks the iframe, ask the Canvas administrator to allow the `github.io` domain.
- If changes do not appear, open the GitHub Pages URL directly and perform a hard refresh.
- Keep the folder name `shear-moment-student` unchanged unless you also update the Canvas iframe URL.
