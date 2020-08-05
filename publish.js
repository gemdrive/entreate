import { parseGemData } from './utils.js';


export async function initDst(driveUri, src, dst, token) {
  const themeUrl = driveUri + src + 'theme.css';
  const themeRes = await fetch(themeUrl + '?access_token=' + token);
  const themeCss = await themeRes.text();

  await fetch(driveUri + dst + 'theme.css?access_token=' + token, {
    method: 'PUT',
    body: themeCss,
  });
}

export async function publishAllEntries(driveUri, src, dst, token) {
  const entriesDirUrl = driveUri + src + 'entries/';
  const response = await fetch(entriesDirUrl + '.gemdrive-ls.tsv?access_token=' + token);
  const gemTsv = await response.text();
  const gemData = parseGemData(gemTsv);

  for (const monthDir of gemData) {
    const monthUrl = entriesDirUrl + monthDir.name;
    await processMonth(monthUrl);
  }

  async function processMonth(monthUrl) {
    const monthResponse = await fetch(monthUrl + '.gemdrive-ls.tsv?access_token=' + token);
    const monthDirs = parseGemData(await monthResponse.text());

    for (const entryDir of monthDirs) {
      const entryUrl = monthUrl + entryDir.name;
      await processEntry(entryUrl);
    }
  }

  async function processEntry(entryUrl) {
    const metaUrl = entryUrl + 'entry.json';
    const metaResponse = await fetch(metaUrl + '?access_token=' + token);
    const meta = await metaResponse.json();

    const textUrl = entryUrl + 'entry.md';
    const textResponse = await fetch(textUrl + '?access_token=' + token);
    const text = await textResponse.text();

    const createDstUrl = driveUri + dst + meta.id + '/';

    await fetch(createDstUrl + '?access_token=' + token, {
      method: 'PUT',
    });

    const entryHtml = marked(text);

    const indexHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <title>${meta.title}</title>

          <link rel="stylesheet"
            href="//cdn.jsdelivr.net/gh/highlightjs/cdn-release@10.1.2/build/styles/tomorrow-night.min.css">

          <link rel='stylesheet' href='../theme.css'>
          
        </head>

        <body>
          <div class='main'>
            <div class='entry'>
              <div class='entry__header'>
                <h1>${meta.title}</h1>
                <h2>${meta.timestamp}</h2>
              </div>
              <div class='entry__content'>
                ${entryHtml}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const indexHtmlUrl = createDstUrl + 'index.html';
    await fetch(indexHtmlUrl + '?access_token=' + token, {
      method: 'PUT',
      body: indexHtml,
    });
  }

  console.log("done");
}
