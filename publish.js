import { parseGemData } from './utils.js';


// https://stackoverflow.com/a/38641281/943814
const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

marked.setOptions({
  highlight: function(code, lang) {
    const highlighted = hljs.highlightAuto(code);
    return highlighted.value;
  },
});


export async function initDst(driveUri, src, dst, token) {
  const themeUrl = driveUri + src + 'theme.css';
  const themeRes = await fetch(themeUrl + '?access_token=' + token);
  const themeCss = await themeRes.text();

  await fetch(driveUri + dst + 'theme.css?access_token=' + token, {
    method: 'PUT',
    body: themeCss,
  });
}

const navHtml = `
  <nav class='semi-transparent'>
    <a class='nav-btn' href='../feed/'>Feed</a>
    <a class='nav-btn' href='../about/'>About</a>
  </nav>
`;

const importsHtml = `
  <link rel="stylesheet"
    href="//cdn.jsdelivr.net/gh/highlightjs/cdn-release@10.1.2/build/styles/tomorrow-night.min.css">
`;

export async function publishAllEntries(driveUri, src, dst, token) {
  const entriesDirUrl = driveUri + src + 'entries/';
  const response = await fetch(entriesDirUrl + '.gemdrive-ls.tsv?access_token=' + token);
  const gemTsv = await response.text();
  const gemData = parseGemData(gemTsv);

  let allEntries = [];
  for (const monthDir of gemData) {
    const monthUrl = entriesDirUrl + monthDir.name;
    const entries = await processMonth(monthUrl);
    allEntries = [...allEntries, ...entries];
  }

  await publishAboutPage();
  await publishFeedPage(allEntries);

  async function processMonth(monthUrl) {
    const monthResponse = await fetch(monthUrl + '.gemdrive-ls.tsv?access_token=' + token);
    const monthDirs = parseGemData(await monthResponse.text());

    const entries = [];

    for (const entryDir of monthDirs) {
      const entryUrl = monthUrl + entryDir.name;
      const entry = await processEntry(entryUrl);
      entries.push(entry);
    }

    return entries;
  }


  async function publishAboutPage() {
    const aboutHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          ${importsHtml}
          <link rel='stylesheet' href='../theme.css'>
          
        </head>

        <body>
          <div class='main'>

            ${navHtml} 

            <div id='portrait-container'>
              <div class='portrait'>
                <img src="./portrait.jpg.gemdrive-img-512.jpg" width="100%">
              </div>
            </div>
            <div class='text-content semi-transparent'>
              <p>
                <strong>Hi there</strong>. My name is Anders Pitman. I am a data
                visualization software engineer. I'm passionate about the power of a good
                visualization to catalyze learning and insight. I'm particularly drawn to
                problems in medicine, education, and social issues. Hans Rosling is my
                hero.
              </p>
            
              <p>
                You can email me at <strong>anders</strong> at this domain. Here are some
                other useful links:
              </p>
            
              <section class='contact-links'>
                <a target="_blank" href="https://github.com/anderspitman">GitHub</a>
                <a target="_blank" href="https://stackoverflow.com/users/943814/anderspitman">StackOverflow</a>
                <a target="_blank" href="https://www.linkedin.com/in/anderspitman/">LinkedIn</a>
                <a target="_blank" href="https://twitter.com/anderspitman">Twitter</a>
              </section>
            
              <!--
              <p>
                Note: The background visualization is actually a bit cooler than it
                looks. The code is pulled live from my public GitHub contributions. You
                can learn more about it
                <a target='_blank' href='/projects/redpill'>here</a>.
              </p>
              -->
            </div>
            <!-- creates space so background visualization continues past content -->
            <div class='spacer'></div>
          </div>
        </body>
      </html>
    `;

    await fetch(driveUri + dst + 'about/?access_token=' + token, {
      method: 'PUT',
    });

    await fetch(driveUri + dst + 'about/index.html?access_token=' + token, {
      method: 'PUT',
      body: aboutHtml,
    });

    const portraitBlob = await fetch(driveUri + src + 'portrait.jpg?access_token=' + token)
      .then(r => r.blob());

    await fetch(driveUri + dst + 'about/portrait.jpg?access_token=' + token, {
      method: 'PUT',
      body: portraitBlob,
    });
  }

  async function publishFeedPage(allEntries) {

    // sort in reverse-chronological order (the key is the entry id, which
    // increases monotonically).
    const sortedEntries = allEntries.slice()
      .sort((a, b) => naturalSorter.compare(a.meta.id, b.meta.id))
      .reverse();

    let entryListHtml = '';
    for (const entry of sortedEntries) {

      const content = entry.content.length < 1024 ? entry.content : '';

      const template = `
        <div class='entry-list__entry'>
          <div class='list-entry'>
            <div class='list-entry__controls'>
              <span class='list-entry__id'>#${entry.meta.id}</span>
              <span>${entry.meta.timestamp}</span>
              <a href='../${entry.meta.id}/#${entry.meta.urlName}' target='_blank' id='open-in-tab-btn' class='list-entry__control-btn'>Open in Tab</a>
              <a href='../${entry.meta.id}/#${entry.meta.urlName}' id='fullscreen-btn' class='list-entry__control-btn'>Fullscreen</a>
            </div>
            <div class='entry'>
              <div class='entry__header'>
                <h1>${entry.meta.title}</h1>
              </div>
              <div class='entry__content'>
                ${content}
              </div>
            </div>
          </div>
        </div>
      `;

      entryListHtml += template;
    }

    const feedHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          ${importsHtml}
          <link rel='stylesheet' href='../theme.css'>
          
        </head>

        <body>
          <div class='main'>
            ${navHtml} 

            <div class='entry-list'>
              ${entryListHtml}
            </div>

          </div>
        </body>
      </html>
    `;

    await fetch(driveUri + dst + 'feed/?access_token=' + token, {
      method: 'PUT',
    });

    await fetch(driveUri + dst + 'feed/index.html?access_token=' + token, {
      method: 'PUT',
      body: feedHtml,
    });
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

          ${importsHtml}
          <link rel='stylesheet' href='../theme.css'>
          
        </head>

        <body>
          <div class='main'>

            ${navHtml}

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

    return { meta, content: entryHtml };
  }

  console.log("done");
}
