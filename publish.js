import { parseGemData, naturalSorter, entryIterator } from './utils.js';

marked.setOptions({
  highlight: function(code, lang) {
    const highlighted = hljs.highlightAuto(code);
    return highlighted.value;
  },
});

const navHtml = `
  <nav class='semi-transparent'>
    <a class='nav-btn' href='../feed/'>Feed</a>
    <a class='nav-btn' href='../about/'>About</a>
  </nav>
`;

const entryNavHtml = `
  <nav class='semi-transparent'>
    <a class='nav-btn' href='../../../../feed/'>Feed</a>
    <a class='nav-btn' href='../../../../about/'>About</a>
  </nav>
`;

const importsHtml = `
  <link rel="stylesheet"
    href="//cdn.jsdelivr.net/gh/highlightjs/cdn-release@10.1.2/build/styles/tomorrow-night.min.css">
`;

export async function publishAllEntries(driveUri, src, token) {

  console.log("Begin Publishing");

  (async () => {
    await publishAboutPage();
    await publishFeedPage(driveUri, src, token);

    console.log("Done Publishing");
  })();

  async function publishAboutPage() {
    const aboutHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <title>Anders' little corner of the internet</title>

          ${importsHtml}
          <link rel='stylesheet' href='../theme.css'>
          
        </head>

        <body>
          <div class='main'>

            ${navHtml} 

            <div id='portrait-container'>
              <div class='portrait'>
                <img src="../portrait.jpg.gemdrive-img-512.jpg" width="100%">
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

    await fetch(driveUri + src + 'about/?access_token=' + token, {
      method: 'PUT',
    });

    await fetch(driveUri + src + 'about/index.html?access_token=' + token, {
      method: 'PUT',
      body: aboutHtml,
    });

    // Main page is just an exact copy of the about page currently. Note that
    // I'm using a bit of a hack here. The template string above uses ../ to
    // access a couple resources, but it works for the root page as well
    // since the browser stops at the top level.
    await fetch(driveUri + src + 'index.html?access_token=' + token, {
      method: 'PUT',
      body: aboutHtml,
    });

    const portraitBlob = await fetch(driveUri + src + 'portrait.jpg?access_token=' + token)
      .then(r => r.blob());

    await fetch(driveUri + src + 'portrait.jpg?access_token=' + token, {
      method: 'PUT',
      body: portraitBlob,
    });
  }

  
}

export async function publishEntry(entryUrl, token) {

  console.log("Publishing " + entryUrl);

  const metaUrl = entryUrl + 'entry.json';
  const metaResponse = await fetch(metaUrl + '?access_token=' + token);
  const meta = await metaResponse.json();

  const textUrl = entryUrl + 'entry.md';
  const textResponse = await fetch(textUrl + '?access_token=' + token);
  const text = await textResponse.text();

  const contentHtml = marked(text);

  const entryHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>${meta.title}</title>

        ${importsHtml}
        <link rel='stylesheet' href='../../../../theme.css'>
        
      </head>

      <body>
        <div class='main'>

          ${entryNavHtml}

          <div class='entry'>
            <div class='entry__header'>
              <h1>${meta.title}</h1>
              <h2>${meta.timestamp}</h2>
            </div>
            <div class='entry__content'>
              ${contentHtml}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const indexHtmlUrl = entryUrl + 'index.html';
  await fetch(indexHtmlUrl + '?access_token=' + token, {
    method: 'PUT',
    body: entryHtml,
  });

  return { meta, content: contentHtml, entryUrl };
}

export async function publishFeedPage(driveUri, src, token) {


  const allTagsSet = new Set();

  const allEntries = [];
  for await (const entryUrl of entryIterator(driveUri + src, token)) {
    const entry = await publishEntry(entryUrl, token);

    for (const tag of entry.meta.tags) {
      allTagsSet.add(tag);
    }

    allEntries.push(entry);
  }

  const allTags = Array.from(allTagsSet);

  const dbUrl = `${driveUri + src}db.json?access_token=${token}`;
  const db = await fetch(dbUrl)
    .then(r => r.json());

  db.tags = allTags.slice().sort();

  await fetch(dbUrl, {
    method: 'PUT',
    body: JSON.stringify(db, null, 2),
  });

  // sort in reverse-chronological order (the key is the entry id, which
  // increases monotonically).
  const sortedEntries = allEntries.slice()
    .sort((a, b) => naturalSorter.compare(a.meta.id, b.meta.id))
    .reverse();

  let entryListHtml = '';
  for (const entry of sortedEntries) {

    const content = entry.content.length < 1024 ? entry.content : '';

    const entryPath = entry.entryUrl.slice((driveUri + src).length);

    const urlName = entry.meta.urlName ? entry.meta.urlName : entry.meta.title
      .toLowerCase().replace(/ /g, '-').replace("'", '');

    const template = `
      <div class='entry-list__entry'>
        <div class='list-entry'>
          <div class='list-entry__controls'>
            <span>${entry.meta.timestamp}</span>
            <a href='../${entryPath}#${urlName}' target='_blank' id='open-in-tab-btn' class='list-entry__control-btn'>Open in Tab</a>
            <a href='../${entryPath}#${urlName}' id='fullscreen-btn' class='list-entry__control-btn'>Fullscreen</a>
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

        <title>Anders' little corner of the internet</title>

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

  await fetch(driveUri + src + 'feed/?access_token=' + token, {
    method: 'PUT',
  });

  await fetch(driveUri + src + 'feed/index.html?access_token=' + token, {
    method: 'PUT',
    body: feedHtml,
  });
}
