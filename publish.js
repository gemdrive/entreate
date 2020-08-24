import {
  parseGemData, naturalSorter, entryIterator, entryPathToId
} from './utils.js';

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

const analyticsHtml = `
  <script data-goatcounter="https://anderspitman_net.goatcounter.com/count"
    async src="//gc.zgo.at/count.js"></script>
`;

export async function publishAllEntries(driveUri, src, token) {

  console.log("Begin Publishing");

  (async () => {


    const themeCssUrl = driveUri + src + 'theme.css?access_token=' + token;
    const themeCss = await fetch(themeCssUrl).then(r => r.text());

    const hlCssUrl = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@10.1.2/build/styles/tomorrow-night.min.css';
    const hlCss = await fetch(hlCssUrl).then(r => r.text());

    const inlineCss = themeCss + hlCss;

    await publishAboutPage(inlineCss);
    await publishFeedPage(driveUri, src, token, inlineCss);

    console.log("Done Publishing");
  })();

  async function publishAboutPage(inlineCss) {
    const aboutHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <title>Anders' little corner of the internet</title>

          <style>
            ${inlineCss}
          </style>
          
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

          ${analyticsHtml}
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

export async function publishEntry(entryUrl, token, inlineCss) {

  console.log("Publishing " + entryUrl);

  const metaUrl = entryUrl + 'entry.json';
  const metaResponse = await fetch(metaUrl + '?access_token=' + token);

  if (metaResponse.status !== 200) {
    return null;
  }

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

        <style>
          ${inlineCss}
        </style>
        
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

          <!-- Begin Mailchimp Signup Form -->
          <link href="//cdn-images.mailchimp.com/embedcode/slim-10_7.css" rel="stylesheet" type="text/css">
          <style type="text/css">
          	#mc_embed_signup{
                    background: var(--bg-color);
                    clear:left;
                    font:1.2em Helvetica, Arial, sans-serif;
                    color: var(--font-color);
                    border: 2px solid #ddd;
                    margin-top: 50px;
                    padding: 20px;
                  }
          	/* Add your own Mailchimp form style overrides in your site stylesheet or in this style block.
          	   We recommend moving this block and the preceding CSS link to the HEAD of your HTML file. */
          </style>
          <div id="mc_embed_signup">
          <p>
          Like what I have to say? Consider subscribing to my newsletter.
          I don't send very many updates.
          </p>
          <form action="https://emauth.us20.list-manage.com/subscribe/post?u=0c3ecbf40cf99a4c67c9e9659&amp;id=902af5df88" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" class="validate" target="_blank" novalidate>
              <div id="mc_embed_signup_scroll">
          	<label for="mce-EMAIL">Subscribe</label>
          	<input type="email" value="" name="EMAIL" class="email" id="mce-EMAIL" placeholder="email address" required>
              <!-- real people should not fill this in and expect good things - do not remove this or risk form bot signups-->
              <div style="position: absolute; left: -5000px;" aria-hidden="true"><input type="text" name="b_0c3ecbf40cf99a4c67c9e9659_902af5df88" tabindex="-1" value=""></div>
              <div class="clear"><input type="submit" value="Subscribe" name="subscribe" id="mc-embedded-subscribe" class="button"></div>
              </div>
          </form>
          </div>
          
          <!--End mc_embed_signup-->
        </div>

        ${analyticsHtml}
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

export async function publishFeedPage(driveUri, src, token, inlineCss) {


  const allTags = {};

  const allEntries = [];
  for await (const entryUrl of entryIterator(driveUri + src, token)) {
    const entry = await publishEntry(entryUrl, token, inlineCss);

    if (entry) {
      for (const tag of entry.meta.tags) {
        if (!allTags[tag]) {
          allTags[tag] = [];
        }

        const entryPath = entryUrl.slice((driveUri + src).length);
        const entryId = entryPathToId(entryPath);

        allTags[tag].push(entryId);
      }

      allEntries.push(entry);
    }
  }

  const dbUrl = `${driveUri + src}db.json?access_token=${token}`;
  const db = await fetch(dbUrl)
    .then(r => r.json());

  db.tags = allTags;

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

        <style>
          ${inlineCss}
        </style>
        
      </head>

      <body>
        <div class='main'>
          ${navHtml} 

          <div class='entry-list'>
            ${entryListHtml}
          </div>

        </div>

        ${analyticsHtml}

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
