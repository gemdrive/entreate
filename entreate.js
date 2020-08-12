import { el, parseGemData, ValueInput, MarginBox, entryIterator, naturalSorter } from './utils.js';
import { publishAllEntries } from './publish.js';
import { TagEditor, TagList } from './tag_editor.js';


function Entreate(driveUri, path, token) {
  const dom = document.createElement('div');
  dom.classList.add('entreate');

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const contentEl = el('div');
  contentEl.appendChild(el('div'));
  dom.appendChild(contentEl);


  const entriesDirUrl = driveUri + path;

  let newEntry = false;

  async function navigate(page, data) {

    const tagsUrl = driveUri + path + 'tags.json';
    const response = await fetch(tagsUrl, { headers });

    let tags;
    if (response.status === 404) {
      await fetch(tagsUrl, {
        method: 'PUT',
        headers,
        body: '[]',
      });

      tags = [];
    }
    else if (response.status === 403) {
      const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

      if (doAuth) {
        dom.dispatchEvent(new CustomEvent('do-auth', {
          bubbles: true,
        }));
      }
    }
    else {
      tags = await response.json();
    }

    switch (page) {
      case '/home': {
        const entryList = EntryList(entriesDirUrl, headers, token);
        contentEl.replaceChild(entryList, contentEl.firstChild);

        entryList.addEventListener('entry-selected', (e) => {
          navigate('/editor', e.detail);
        });

        entryList.addEventListener('create-entry', async (e) => {

          const entryUrl = await initEntry(dom, driveUri, path, headers);

          navigate('/editor', {
            entryUrl,
            meta: {
              tags: [],
            },
          });
        });

        entryList.addEventListener('publish-all', async (e) => {
          publishAllEntries(driveUri, path, token);
        });
        break;
      }
      case '/editor':

        let text = "";
        const textResponse = await fetch(data.entryUrl + 'entry.md', { headers });
        if (textResponse.status === 200) {
          text = await textResponse.text();
        }

        const entryEditor = EntryEditor(data.entryUrl, text, data.meta, tags);
        contentEl.replaceChild(entryEditor.dom, contentEl.firstChild);

        entryEditor.dom.addEventListener('save', async (e) => {

          const entryUrl = e.detail.entryUrl;
          const text = e.detail.text;
          const meta = e.detail.meta;

          let entryFileUrl = entryUrl + 'entry.md';

          fetch(entryFileUrl, {
            method: 'PUT',
            headers,
            body: text,
          });

          let metaFileUrl = entryUrl + 'entry.json';

          fetch(metaFileUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(meta, null, 2),
          });
        });

        entryEditor.dom.addEventListener('close', (e) => {
          navigate('/home');
        });

        entryEditor.dom.addEventListener('create-tag', (e) => {
          tags.push(e.detail.tag);

          entryEditor.updateTags(tags);

          fetch(tagsUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(tags, null, 2),
          });
        });

        break;
    }
  }

  navigate('/home');

  return dom;
}

function EntryList(entriesDirUrl, headers, token) {
  const dom = el('div');
  dom.classList.add('entry-list');

  (async () => {
    
    const createEntryButton = el('button', {
      onclick: () => {
        dom.dispatchEvent(new CustomEvent('create-entry', {
          bubbles: true,
        }));
      },
    });
    createEntryButton.innerText = "Create entry";
    dom.appendChild(createEntryButton);

    const publishAllBtn = el('button', {
      onclick: () => {
        dom.dispatchEvent(new CustomEvent('publish-all', {
          bubbles: true,
        }));
      },
    });
    publishAllBtn.innerText = "Publish All";
    dom.appendChild(publishAllBtn);

    // Iterate entries in reverse-chronological order
    const compare = (a, b) => naturalSorter.compare(b, a);
    for await (const entryUrl of entryIterator(entriesDirUrl, token, compare)) {
      const entryEl = EntryListItem(entryUrl, token);
      dom.appendChild(entryEl);
    }

  })();


  return dom;
}

function EntryListItem(entryUrl, token) {
  const dom = el('div');
  dom.classList.add('entry-list-item');

  const metaUrl = entryUrl + 'entry.json?access_token=' + token;

  fetch(metaUrl).then(async (response) => {

    const meta = await response.json();

    const topRow = el('div');
    topRow.classList.add('entry-list__top-row');
    dom.appendChild(topRow);

    const bottomRow = el('div');
    bottomRow.classList.add('entry-list__bottom-row');
    dom.appendChild(bottomRow);

    const nameEl = el('div');
    topRow.appendChild(nameEl);
    nameEl.innerText = meta.title + ' (' + meta.timestamp + ')';

    const editButton = el('button');
    editButton.innerText = "Edit";
    topRow.appendChild(editButton);

    editButton.addEventListener('click', (e) => {
      dom.dispatchEvent(new CustomEvent('entry-selected', {
        bubbles: true,
        detail: {
          entryUrl,
          meta,
        },
      }));
    });


    const tagList = TagList(meta.tags);
    bottomRow.appendChild(tagList);
  });

  return dom;
}


function EntryEditor(entryUrl, text, meta, allTags) {
  const dom = el('div');
  dom.classList.add('entreate-entry-editor');

  const homeButton = el('button', {
    onclick: (e) => {
      dom.dispatchEvent(new CustomEvent('close', {
        bubbles: true,
      }));
    },
  });
  homeButton.innerText = 'Home';
  dom.appendChild(homeButton);

  const saveButton = el('button', {
    onclick: (e) => {
      dom.dispatchEvent(new CustomEvent('save', {
        bubbles: true,
        detail: {
          entryUrl,
          text: editor.getValue(),
          meta: Object.assign(meta, {
            title: titleInput.getValue() ? titleInput.getValue() : 'Untitled',
            tags,
          }),
        },
      }));
    },
  });
  saveButton.classList.add('entreate-button', 'entreate-button-confirm');
  saveButton.innerText = 'Save';
  dom.appendChild(saveButton);

  const titleInput = ValueInput('Title', meta.title);
  dom.appendChild(MarginBox(titleInput.dom));

  let tags = meta.tags;
  const tagEditor = TagEditor(allTags, meta.tags);
  dom.appendChild(MarginBox(tagEditor.dom));
  tagEditor.dom.addEventListener('tags-changed', (e) => {
    tags = e.detail.tags;
  });

  let fontSize = 16;
  const decreaseFontBtn = el('button', {
    onclick: () => {
      fontSize -= 1;
      textContainer.style['font-size'] = fontSize + 'px';
    },
  });
  decreaseFontBtn.innerText = "- Font size";
  dom.appendChild(decreaseFontBtn);
  const increaseFontBtn = el('button', {
    onclick: () => {
      fontSize += 1;
      textContainer.style['font-size'] = fontSize + 'px';
    },
  });
  increaseFontBtn.innerText = "+ Font size";
  dom.appendChild(increaseFontBtn);

  const textContainer = el('div');
  textContainer.classList.add('entreate-entry-editor__text');
  dom.appendChild(textContainer);

  const editor = CodeMirror(textContainer, {
    lineNumbers: true,
    value: text,
    //viewportMargin: Infinity,
  });

  // See https://stackoverflow.com/a/19970695/943814
  setTimeout(() => {
    editor.refresh();
  }, 0);


  return {
    dom,
    updateTags: tagEditor.updateTags,
  };
}


async function initEntry(dom, driveUri, path, headers) {

  const date = new Date().toISOString().split('.')[0] + 'Z';
  const yearMonth = date.slice(0, 7);
  const day = date.slice(8, 10);

  const createDateDirUrl = driveUri + path + `entries/${yearMonth}/`;
  const dateResponse = await fetch(createDateDirUrl, {
    method: 'PUT',
    headers,
  });

  if (dateResponse.status === 403) {
    const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

    if (doAuth) {
      dom.dispatchEvent(new CustomEvent('do-auth', {
        bubbles: true,
      }));
    }

    return;
  }


  const gemUrl = driveUri + path + `entries/${yearMonth}/.gemdrive-ls.tsv`;

  const promises = [
    fetch(gemUrl, {
      headers,
    }),
  ];

  const [ gemReponse ] = await Promise.all(promises);
  const tsv = await gemReponse.text();
  const gemData = parseGemData(tsv);

  //const name = date + '-' + meta.title;
  const name = date;
  const nextEntryName = genNextEntryName(gemData, name);

  const entryUrl = driveUri + path + `entries/${yearMonth}/${nextEntryName}`;

  let createDirUrl = entryUrl;

  // need to await directory creation before proceeding
  await fetch(createDirUrl, {
    method: 'PUT',
    headers,
  });

  let entryFileUrl = entryUrl + 'entry.md';

  fetch(entryFileUrl, {
    method: 'PUT',
    headers,
    body: "",
  });

  let metaFileUrl = entryUrl + 'entry.json';

  const meta = {
    title: 'Untitled',
    tags: [],
    timestamp: date,
  };

  fetch(metaFileUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(meta, null, 2),
  });

  return entryUrl;
}

function genNextEntryName(gemData, name) {

  if (gemData.length === 0 || gemData.filter(e => e.name === name + '/').length === 0) {
    return name.replace(/ /gi, '_') + '/';
  }

  let genName;
  for (let i = 2; i < 1000; i++) {
    const newName = (name + '_' + i + '/').replace(/ /gi, '_');
    // TODO: not efficient
    const filtered = gemData.filter(e => e.name === newName);
    if (filtered.length === 0) {
      return newName;
    }
  }

  throw new Error("too many iterations");
}




export {
  Entreate,
};
