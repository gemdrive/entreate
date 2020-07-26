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

  const gemUrl = driveUri + path + 'entries/.gemdrive-ls.tsv';

  const promises = [
    fetch(gemUrl, {
      headers,
    }),
  ];

  const [ gemReponse ] = await Promise.all(promises);

  if (gemReponse.status === 403) {
    const doAuth = confirm("Unauthorized. Do you want to attempt authorization?");

    if (doAuth) {
      dom.dispatchEvent(new CustomEvent('do-auth', {
        bubbles: true,
      }));
    }

    return;
  }
  else if (gemReponse.status !== 200) {
    alert("Failed for unknown reason");
    return;
  }

  

  const tsv = await gemReponse.text();
  const gemData = parseGemData(tsv);

  let nextId = 1;
  if (gemData.length > 0) {
    const sortedGemData = gemData.slice()
      .sort((a, b) => naturalSorter.compare(a.name, b.name));
    const lastId = Number(sortedGemData[sortedGemData.length - 1].name.slice(0, -1));
    nextId = lastId + 1;
  }

  const entryUrl = driveUri + path + `entries/${nextId}/`;

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

  const titleInputLabel = el('span');
  titleInputLabel.innerText = "Title:";
  dom.appendChild(titleInputLabel);

  const titleInput = el('input');
  titleInput.setAttribute('type', 'text');
  titleInput.classList.add('entreate-entry-creator__title-input');
  dom.appendChild(titleInput);

  let tags = [];
  const tagEditor = TagEditor(inTags);
  dom.appendChild(tagEditor.dom);
  tagEditor.dom.addEventListener('tags-changed', (e) => {
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
    updateTags: tagEditor.updateTags,
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

  let select = TagSelect(inTags, tags, tagList);
  dom.appendChild(select);


  function updateTags(newTags) {
    const newSelect = TagSelect(newTags, tags, tagList);
    dom.replaceChild(newSelect, select);
    select = newSelect;
  }

  return {
    dom,
    updateTags,
  };
}

function TagSelect(inTags, tags, tagList) {
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
        }

        tagName = newTag;
      }

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

  function notifyChanged() {
    select.dispatchEvent(new CustomEvent('tags-changed', {
      bubbles: true,
      detail: {
        tags,
      },
    }));
  }

  return select;
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
