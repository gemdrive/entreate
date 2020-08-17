import {
  el, parseGemData, ValueInput, MarginBox, entryIterator, naturalSorter,
  idToPath,
} from './utils.js';
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

    const dbUrl = driveUri + path + 'db.json?access_token=' + token;
    const response = await fetch(dbUrl);

    let db;
    if (response.status === 404) {

      db = {
        lastId: 1,
        tags: [],
      };

      await fetch(dbUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(db, null, 2),
      });

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
      db = await response.json();
    }

    switch (page) {
      case '/home': {
        const entryList = EntryList(entriesDirUrl, token);
        contentEl.replaceChild(entryList, contentEl.firstChild);

        entryList.addEventListener('entry-selected', (e) => {
          navigate('/editor', e.detail);
        });

        entryList.addEventListener('entry-delete', async (e) => {
          const doIt = confirm("Delete entry? " + e.detail.entryUrl);

          if (doIt) {
            await fetch(e.detail.entryUrl + '?access_token=' + token, {
              method: 'DELETE',
            });
          }
        });

        entryList.addEventListener('create-entry', async (e) => {

          const entryUrl = await initEntry(dom, driveUri, path, token);

          if (entryUrl) {
            navigate('/editor', {
              entryUrl,
              meta: {
                tags: [],
              },
            });
          }
          else {
            alert("Failed to create entry. The id might already exist");
          }
        });

        entryList.addEventListener('publish-all', async (e) => {
          publishAllEntries(driveUri, path, token);
        });
        break;
      }
      case '/editor':

        let text = "";
        const textResponse = await fetch(data.entryUrl + 'entry.md?access_token=' + token);
        if (textResponse.status === 200) {
          text = await textResponse.text();
        }

        const entryEditor = EntryEditor(data.entryUrl, text, data.meta, db.tags);
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
          db.tags.push(e.detail.tag);

          entryEditor.updateTags(db.tags);

          fetch(dbUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(db, null, 2),
          });
        });

        break;
    }
  }

  navigate('/home');

  return dom;
}

function EntryList(entriesDirUrl, token) {
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
      if (entryEl) {
        dom.appendChild(entryEl);
      }
    }

  })();


  return dom;
}

function EntryListItem(entryUrl, token) {
  const dom = el('div');

  const metaUrl = entryUrl + 'entry.json?access_token=' + token;
  const entryUrlParts = entryUrl.split('/')
  const entryId = entryUrlParts[entryUrlParts.length - 2];

  fetch(metaUrl).then(async (response) => {

    if (response.status !== 200) {
      return;
    }

    dom.classList.add('entry-list-item');

    const meta = await response.json();

    const topRow = el('div');
    topRow.classList.add('entry-list__top-row');
    dom.appendChild(topRow);

    const bottomRow = el('div');
    bottomRow.classList.add('entry-list__bottom-row');
    dom.appendChild(bottomRow);

    const nameEl = el('div');
    topRow.appendChild(nameEl);
    nameEl.innerText = '[' +entryId + '] ' + meta.title + ' (' + meta.timestamp + ')';

    const btnContainer = el('div');
    topRow.appendChild(btnContainer);

    const editButton = el('button');
    editButton.innerText = "Edit";
    btnContainer.appendChild(editButton);

    editButton.addEventListener('click', (e) => {
      dom.dispatchEvent(new CustomEvent('entry-selected', {
        bubbles: true,
        detail: {
          entryUrl,
          meta,
        },
      }));
    });

    const deleteButton = el('button', {
      onclick: () => {
        dom.dispatchEvent(new CustomEvent('entry-delete', {
          bubbles: true,
          detail: {
            entryUrl,
          },
        }));
      },
    });
    deleteButton.innerText = "Delete";
    btnContainer.appendChild(deleteButton);


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


async function initEntry(dom, driveUri, path, token) {

  const dbUrl = `${driveUri + path}db.json?access_token=${token}`;

  const db = await fetch(dbUrl)
    .then(r => r.json());

  const entryId = db.lastId + 1;
  const entryDirUrl = driveUri + path + idToPath(entryId);
  console.log(entryDirUrl);

  const createDateDirUrl = entryDirUrl + '?recursive=true&access_token=' + token;
  const createResponse = await fetch(createDateDirUrl, {
    method: 'PUT',
  });

  if (createResponse.status === 400) {
    return null;
  }
  else if (createResponse.status === 403) {
    const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

    if (doAuth) {
      dom.dispatchEvent(new CustomEvent('do-auth', {
        bubbles: true,
      }));
    }

    return;
  }

  db.lastId = entryId;
  const dbPutRes = await fetch(dbUrl, {
    method: 'PUT',
    body: JSON.stringify(db, null, 2),
  });

  if (dbPutRes.status !== 200) {
    throw new Error("db PUT failed. Not good");
  }

  
  let entryFileUrl = entryDirUrl + 'entry.md';

  await fetch(entryFileUrl + '?access_token=' + token, {
    method: 'PUT',
    body: "",
  });

  let metaFileUrl = entryDirUrl + 'entry.json';

  const timestamp = new Date().toISOString().split('.')[0] + 'Z';

  const meta = {
    title: 'Untitled',
    tags: [],
    timestamp,
  };

  await fetch(metaFileUrl + '?access_token=' + token, {
    method: 'PUT',
    body: JSON.stringify(meta, null, 2),
  });

  return entryDirUrl;
}

function genNextEntryName(gemData) {

  for (let i = 1; i < 5000; i++) {
    const name = i.toString() + '/';
    if (!gemData.children[name]) {
      return name;
    }
  }

  throw new Error("too many iterations");
}


export {
  Entreate,
};
