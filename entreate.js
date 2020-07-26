function Entreate(driveUri, path, token) {
  const dom = document.createElement('div');
  dom.classList.add('entreate');

  const entryCreator = EntryCreator();
  dom.appendChild(entryCreator.dom);

  entryCreator.dom.addEventListener('create-entry', (e) => {
    createEntry(dom, driveUri, path, token, e.detail.text, e.detail.meta);
  });

  return dom;
}

async function createEntry(dom, driveUri, path, token, text, meta) {

  let gemUrl = driveUri + path + 'entries/.gemdrive-ls.tsv';
  if (token) {
    gemUrl += '?access_token=' + token;
  }

  const response = await fetch(gemUrl);

  if (response.status === 403) {
    const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

    if (doAuth) {
      dom.dispatchEvent(new CustomEvent('do-auth', {
        bubbles: true,
      }));
    }

    return;
  }
  else if (response.status !== 200) {
    alert("Failed for unknown reason");
    return;
  }

  const tsv = await response.text();
  const gemData = parseGemData(tsv);

  let nextId = 1;
  if (gemData.length > 0) {
    console.log(gemData);
    const lastId = Number(gemData[gemData.length - 1].name.slice(0, -1));
    nextId = lastId + 1;
  }

  const entryUrl = driveUri + path + `entries/${nextId}/`;

  let createDirUrl = entryUrl;
  if (token) {
    createDirUrl += '?access_token=' + token;
  }

  await fetch(createDirUrl, {
    method: 'PUT',
  });

  let entryFileUrl = entryUrl + 'entry.md';
  if (token) {
    entryFileUrl += '?access_token=' + token;
  }

  await fetch(entryFileUrl, {
    method: 'PUT',
    body: text,
  });

  let metaFileUrl = entryUrl + 'entry.json';
  if (token) {
    metaFileUrl += '?access_token=' + token;
  }

  await fetch(metaFileUrl, {
    method: 'PUT',
    body: JSON.stringify(meta),
  });
}

function parseGemData(tsv) {
  return tsv.split('\n')
    .filter(line => line.length > 0)
    .map(line => line.split('\t'))
    .map(columns => ({
      name: columns[0],
      modTime: columns[1],
      size: columns[2],
    }));
}


function EntryCreator() {
  const dom = el('div');
  dom.classList.add('entreate-entry-creator');

  const titleInputLabel = el('span');
  titleInputLabel.innerText = "Title:";
  dom.appendChild(titleInputLabel);

  const titleInput = el('input');
  titleInput.setAttribute('type', 'text');
  titleInput.classList.add('entreate-entry-creator__title-input');
  dom.appendChild(titleInput);

  let tags = [];
  const tagEditor = TagEditor();
  dom.appendChild(tagEditor);
  tagEditor.addEventListener('tags-changed', (e) => {
    tags = e.detail.tags;
  });

  const textInput = el('textarea');
  textInput.classList.add('entreate-entry-creator__text-input');
  dom.appendChild(textInput);

  const submitButton = el('button', {
    onclick: (e) => {
      dom.dispatchEvent(new CustomEvent('create-entry', {
        bubbles: true,
        detail: {
          text: textInput.value,
          meta: {
            title: titleInput.value,
            tags,
          }
        },
      }));
    },
  });
  submitButton.classList.add('entreate-button', 'entreate-button-confirm');
  submitButton.innerText = 'Submit';
  dom.appendChild(submitButton);

  return {
    dom,
  };
}

function TagEditor() {
  const dom = el('div');
  dom.classList.add('tag-editor');

  const title = el('div');
  title.innerText = "Tags:";
  dom.appendChild(title);

  const tagList = el('div');
  tagList.classList.add('tag-editor__tag-list');
  dom.appendChild(tagList);

  const input = el('input');
  input.setAttribute('type', 'text');
  dom.appendChild(input);

  let tags = [];
  const addBtn = el('button', {
    onclick: (e) => {
      const tagName = input.value;
      if (tagName && !tags.includes(tagName)) {
        const tag = el('div', {
          onclick: (e) => {
            tagList.removeChild(tag);
            tags = tags.filter(t => t !== tagName);
            notifyChanged();
          },
        });
        tag.classList.add('tag-editor__tag');
        tag.innerText = tagName;
        tagList.appendChild(tag);

        tags.push(tagName);
        notifyChanged();
      }
    },
  });
  addBtn.innerText = "Add Tag";
  dom.appendChild(addBtn);

  function notifyChanged() {
    dom.dispatchEvent(new CustomEvent('tags-changed', {
      bubbles: true,
      detail: {
        tags,
      },
    }));
  }

  return dom;
}


function el(elType, options) {
  const dom = document.createElement(elType);

  if (options) {

    for (const key in options) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2);
        dom.addEventListener(eventName, options[key]);
      }
    }

    if (options.classList) {
      for (const cls of options.classList) {
        dom.classList.add(cls);
      }
    }
  }

  return dom;
}


export {
  Entreate,
};
