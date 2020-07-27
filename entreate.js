// https://stackoverflow.com/a/38641281/943814
const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

function Entreate(driveUri, path, token) {
  const dom = document.createElement('div');
  dom.classList.add('entreate');

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const tagsUrl = driveUri + path + 'tags.json';

  fetch(tagsUrl, {
    headers,
  }).then(async (response) => {

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

    const entryCreator = EntryCreator(tags);
    dom.appendChild(entryCreator.dom);

    entryCreator.dom.addEventListener('create-entry', (e) => {
      createEntry(dom, driveUri, path, headers, e.detail.text, e.detail.meta);
    });

    entryCreator.dom.addEventListener('create-tag', (e) => {
      tags.push(e.detail.tag);

      entryCreator.updateTags(tags);

      fetch(tagsUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(tags),
      });
    });
  });

  return dom;
}

async function createEntry(dom, driveUri, path, headers, text, meta) {

  const date = new Date().toISOString().split('.')[0];
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

  const name = date + '-' + meta.title;
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
    body: text,
  });

  let metaFileUrl = entryUrl + 'entry.json';

  fetch(metaFileUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(meta),
  });
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


function EntryCreator(inTags) {
  const dom = el('div');
  dom.classList.add('entreate-entry-creator');

  const titleInput = ValueInput('Title');
  dom.appendChild(MarginBox(titleInput.dom));

  let tags = [];
  const tagEditor = TagEditor(inTags);
  dom.appendChild(MarginBox(tagEditor.dom));
  tagEditor.dom.addEventListener('tags-changed', (e) => {
    tags = e.detail.tags;
  });

  const textInput = el('textarea');
  textInput.classList.add('entreate-entry-creator__text-input');
  dom.appendChild(MarginBox(textInput));

  const submitButton = el('button', {
    onclick: (e) => {
      dom.dispatchEvent(new CustomEvent('create-entry', {
        bubbles: true,
        detail: {
          text: textInput.value,
          meta: {
            title: titleInput.getValue() ? titleInput.getValue() : 'Untitled',
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
    updateTags: tagEditor.updateTags,
  };
}

function ValueInput(name) {
  const dom = el('div');
  dom.classList.add('value-input');

  const labelEl = el('span');
  labelEl.classList.add('value-input__label');
  labelEl.innerText = `${name}:`;
  dom.appendChild(labelEl);

  const inputEl = el('input');
  inputEl.setAttribute('type', 'text');
  dom.appendChild(inputEl);

  function getValue() {
    return inputEl.value;
  }

  return {
    dom,
    getValue,
  };
}

function TagEditor(inTags) {
  const dom = el('div');
  dom.classList.add('tag-editor');

  const title = el('div');
  title.innerText = "Tags:";
  dom.appendChild(title);

  const tagList = el('div');
  tagList.classList.add('tag-editor__tag-list');
  dom.appendChild(tagList);

  let tags = [];

  let select = TagSelect(inTags);
  wireSelect();
  dom.appendChild(select);

  function notifyChanged() {
    select.dispatchEvent(new CustomEvent('tags-changed', {
      bubbles: true,
      detail: {
        tags,
      },
    }));
  }

  function wireSelect() {
    select.addEventListener('tag-selected', (e) => {

    const tagName = e.detail.tagName;

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
  });
  }

  function updateTags(newTags) {
    const newSelect = TagSelect(newTags);
    dom.replaceChild(newSelect, select);
    select = newSelect;
    wireSelect();
  }

  return {
    dom,
    updateTags,
  };
}

function TagSelect(inTags) {
  const select = el('select', {
    onchange: (e) => {

      let tagName = select.value;

      select.value = 'choose';

      if (tagName === 'create') {
        const newTag = prompt("Enter a tag");
        if (newTag && !inTags.includes(newTag)) {
          select.dispatchEvent(new CustomEvent('create-tag', {
            bubbles: true,
            detail: {
              tag: newTag,
            },
          }));

          tagName = newTag;
        }
        else {
          alert("Tag already exists");
          return;
        }
      }

      select.dispatchEvent(new CustomEvent('tag-selected', {
        bubbles: true,
        detail: {
          tagName,
        },
      }));
    },
  });

  const firstOption = el('option');
  firstOption.value = 'choose';
  firstOption.innerText = "Select a tag";
  select.appendChild(firstOption);
  for (const tag of inTags) {
    const option = el('option');
    option.setAttribute('value', tag);
    option.innerText = tag;
    select.appendChild(option);
  }
  const addTagOption = el('option');
  addTagOption.setAttribute('value', 'create');
  addTagOption.innerText = "New tag";
  select.appendChild(addTagOption);

  return select;
}

function MarginBox(child) {
  const dom = el('div');
  dom.classList.add('margin-box');
  dom.appendChild(child);
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
